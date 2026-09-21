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

    private static final String ALLOWED_ORIGIN =
            "https://aviro-affordable-verified-intelligent-ride-organizer-fuj8eamw3.vercel.app";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // =========================================================
        // CORS PREFLIGHT
        // Browser sends OPTIONS before POST /api/auth/login
        // =========================================================
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {

            String origin = request.getHeader("Origin");

            if (ALLOWED_ORIGIN.equals(origin)
                    || "http://localhost:3000".equals(origin)) {

                response.setHeader(
                        "Access-Control-Allow-Origin",
                        origin
                );

                response.setHeader(
                        "Access-Control-Allow-Credentials",
                        "true"
                );

                response.setHeader(
                        "Access-Control-Allow-Methods",
                        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
                );

                response.setHeader(
                        "Access-Control-Allow-Headers",
                        "Authorization, Content-Type, Accept, Origin, X-Requested-With"
                );

                response.setHeader(
                        "Access-Control-Max-Age",
                        "3600"
                );

                response.setStatus(
                        HttpServletResponse.SC_OK
                );

                return;
            }

            response.setStatus(
                    HttpServletResponse.SC_FORBIDDEN
            );

            return;
        }

        try {

            // =====================================================
            // Extract JWT
            // =====================================================
            String jwt = extractToken(request);

            if (StringUtils.hasText(jwt)) {

                // =================================================
                // Check expired token
                // =================================================
                if (jwtTokenProvider.isTokenExpired(jwt)) {

                    log.warn(
                            "Expired JWT on request: {}",
                            request.getRequestURI()
                    );

                    response.setStatus(
                            HttpServletResponse.SC_UNAUTHORIZED
                    );

                    response.setContentType(
                            "application/json"
                    );

                    response.getWriter().write(
                            "{\"success\":false,\"message\":\"Token expired. Please login again.\"}"
                    );

                    return;
                }

                // =================================================
                // Validate JWT
                // =================================================
                if (jwtTokenProvider.validateToken(jwt)) {

                    String email =
                            jwtTokenProvider.getEmailFromToken(jwt);

                    UserDetails userDetails =
                            userDetailsService.loadUserByUsername(email);

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                    auth.setDetails(
                            new WebAuthenticationDetailsSource()
                                    .buildDetails(request)
                    );

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

            log.warn(
                    "JWT auth filter error: {}",
                    ex.getMessage()
            );
        }

        // =========================================================
        // Continue normal request
        // =========================================================
        filterChain.doFilter(request, response);
    }

    // =============================================================
    // Extract Bearer Token
    // =============================================================
    private String extractToken(
            HttpServletRequest request
    ) {

        String bearerToken =
                request.getHeader("Authorization");

        if (StringUtils.hasText(bearerToken)
                && bearerToken.startsWith("Bearer ")) {

            return bearerToken.substring(7);
        }

        return null;
    }
}
