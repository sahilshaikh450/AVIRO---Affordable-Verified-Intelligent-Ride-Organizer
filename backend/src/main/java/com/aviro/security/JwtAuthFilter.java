package com.aviro.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;

import org.springframework.stereotype.Component;

import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // =========================================================
        // IMPORTANT:
        // Allow CORS preflight requests to pass through.
        // Browser sends OPTIONS before POST/PUT/PATCH etc.
        // =========================================================
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        try {

            // =====================================================
            // Extract JWT from Authorization header
            // =====================================================
            String jwt = extractToken(request);

            if (StringUtils.hasText(jwt)) {

                // =================================================
                // Check whether token is expired
                // =================================================
                if (jwtTokenProvider.isTokenExpired(jwt)) {

                    log.warn(
                            "Expired JWT on request: {}",
                            request.getRequestURI()
                    );

                    response.setStatus(
                            HttpServletResponse.SC_UNAUTHORIZED
                    );

                    response.setContentType("application/json");

                    response.getWriter().write(
                            "{\"success\":false,\"message\":\"Token expired. Please login again.\"}"
                    );

                    return;
                }

                // =================================================
                // Validate token
                // =================================================
                if (jwtTokenProvider.validateToken(jwt)) {

                    String email =
                            jwtTokenProvider.getEmailFromToken(jwt);

                    // =============================================
                    // Load user from database
                    // =============================================
                    UserDetails userDetails =
                            userDetailsService.loadUserByUsername(email);

                    // =============================================
                    // Create authentication object
                    // =============================================
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                    // =============================================
                    // Attach request details
                    // =============================================
                    auth.setDetails(
                            new WebAuthenticationDetailsSource()
                                    .buildDetails(request)
                    );

                    // =============================================
                    // Set authenticated user
                    // =============================================
                    SecurityContextHolder
                            .getContext()
                            .setAuthentication(auth);

                    log.debug(
                            "JWT authenticated user: {}",
                            email
                    );
                }
            }

        } catch (Exception ex) {

            // =====================================================
            // JWT error should not crash request
            // =====================================================
            log.warn(
                    "JWT auth filter error: {}",
                    ex.getMessage()
            );
        }

        // =========================================================
        // Continue request
        // =========================================================
        filterChain.doFilter(request, response);
    }

    // =============================================================
    // Extract Bearer Token
    // =============================================================
    private String extractToken(HttpServletRequest request) {

        String bearerToken =
                request.getHeader("Authorization");

        if (StringUtils.hasText(bearerToken)
                && bearerToken.startsWith("Bearer ")) {

            return bearerToken.substring(7);
        }

        return null;
    }
}
