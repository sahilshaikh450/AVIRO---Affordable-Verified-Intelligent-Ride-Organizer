package com.aviro.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;

@RequiredArgsConstructor
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private record Rule(int maxRequests, Duration window) {}

    private static final Map<String, Rule> RULES =
            Map.ofEntries(
                    Map.entry("/auth/login", new Rule(10, Duration.ofMinutes(1))),
                    Map.entry("/auth/register", new Rule(5, Duration.ofMinutes(10))),
                    Map.entry("/auth/forgot-password", new Rule(3, Duration.ofMinutes(10))),
                    Map.entry("/auth/resend-otp", new Rule(3, Duration.ofMinutes(10))),
                    Map.entry("/auth/send-college-email-otp", new Rule(3, Duration.ofMinutes(10))),
                    Map.entry("/auth/reset-password", new Rule(10, Duration.ofMinutes(10))),
                    Map.entry("/auth/verify-otp", new Rule(10, Duration.ofMinutes(10))),
                    Map.entry("/auth/login-verify-otp", new Rule(10, Duration.ofMinutes(10))),
                    Map.entry(
                            "/auth/verify-college-email-otp", new Rule(10, Duration.ofMinutes(10))),
                    Map.entry("/auth/refresh-token", new Rule(30, Duration.ofMinutes(1))),
                    Map.entry("/rides", new Rule(20, Duration.ofHours(1))),
                    Map.entry("/bookings", new Rule(30, Duration.ofHours(1))),
                    Map.entry("/chat/send", new Rule(60, Duration.ofMinutes(1))),
                    Map.entry("/reviews", new Rule(20, Duration.ofHours(1))),
                    Map.entry("/users/upload-college-id", new Rule(10, Duration.ofHours(1))),
                    Map.entry("/ride-requests", new Rule(20, Duration.ofHours(1))));

    private static final String SAFETY_PREFIX = "/safety/";
    private static final Rule SAFETY_RULE = new Rule(10, Duration.ofMinutes(10));
    private static final String SOS_PATH = "/safety/sos";
    private static final Rule SOS_RULE = new Rule(10, Duration.ofMinutes(10));
    private static final String CONTACTS_PATH = "/safety/emergency-contacts";
    private static final Rule CONTACTS_RULE = new Rule(20, Duration.ofHours(1));

    private static final String RIDE_OTP_SUFFIX = "/verify-ride-otp";
    private static final Rule RIDE_OTP_RULE = new Rule(5, Duration.ofMinutes(10));

    private final AttemptCounter counter;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equalsIgnoreCase(request.getMethod()) || ruleFor(path(request)) == null;
    }

    private Rule ruleFor(String path) {
        Rule rule = RULES.get(path);
        if (rule != null) return rule;
        if (path.equals(SOS_PATH)) return SOS_RULE;
        if (path.equals(CONTACTS_PATH)) return CONTACTS_RULE;
        if (path.startsWith(SAFETY_PREFIX)) return SAFETY_RULE;
        return path.startsWith("/bookings/") && path.endsWith(RIDE_OTP_SUFFIX)
                ? RIDE_OTP_RULE
                : null;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = path(request);
        Rule rule = ruleFor(path);
        String bucket =
                path.startsWith(SAFETY_PREFIX)
                                && !path.equals(SOS_PATH)
                                && !path.equals(CONTACTS_PATH)
                        ? SAFETY_PREFIX
                        : path;
        String key = "aviro:rl:" + bucket + ":" + caller(request);

        try {
            long count = counter.increment(key, rule.window());
            if (count > rule.maxRequests()) {
                long retryAfterSec = counter.secondsLeftInWindow(rule.window());
                log.warn("Rate limit hit: {} from {}", path, clientIp(request));
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setHeader("Retry-After", String.valueOf(retryAfterSec));
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding("UTF-8");
                long minutes = (retryAfterSec + 59) / 60;
                response.getWriter()
                        .write(
                                "{\"success\":false,\"message\":\"Too many attempts. Please try"
                                        + " again in "
                                        + minutes
                                        + (minutes == 1 ? " minute" : " minutes")
                                        + ".\"}");
                return;
            }
        } catch (Exception e) {
            log.warn("Rate limit check failed: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String path(HttpServletRequest request) {
        return request.getRequestURI().substring(request.getContextPath().length());
    }

    private String caller(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ") && auth.length() > 40) {
            return "t" + Integer.toHexString(auth.hashCode()) + auth.substring(auth.length() - 12);
        }
        return clientIp(request);
    }

    private String clientIp(HttpServletRequest request) {
        String cf = request.getHeader("CF-Connecting-IP");
        if (cf != null && !cf.isBlank()) return cf.trim();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] hops = forwarded.split(",");
            return hops[hops.length - 1].trim();
        }
        return request.getRemoteAddr();
    }
}
