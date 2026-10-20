package com.aviro.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;

/**
 * Fixed-window rate limiting for auth endpoints, counted per client IP in Redis.
 * Added inside the security chain (after CORS) so 429 responses still carry CORS headers.
 */
@RequiredArgsConstructor
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private record Rule(int maxRequests, Duration window) {}

    private static final Map<String, Rule> RULES = Map.of(
            "/auth/login",                    new Rule(10, Duration.ofMinutes(1)),
            "/auth/register",                 new Rule(5,  Duration.ofMinutes(10)),
            "/auth/forgot-password",          new Rule(3,  Duration.ofMinutes(10)),
            "/auth/resend-otp",               new Rule(3,  Duration.ofMinutes(10)),
            "/auth/send-college-email-otp",   new Rule(3,  Duration.ofMinutes(10)),
            "/auth/reset-password",           new Rule(10, Duration.ofMinutes(10)),
            "/auth/verify-otp",               new Rule(10, Duration.ofMinutes(10)),
            "/auth/login-verify-otp",         new Rule(10, Duration.ofMinutes(10)),
            "/auth/verify-college-email-otp", new Rule(10, Duration.ofMinutes(10)),
            "/auth/refresh-token",            new Rule(30, Duration.ofMinutes(1))
    );

    private final StringRedisTemplate redisTemplate;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equalsIgnoreCase(request.getMethod()) || !RULES.containsKey(path(request));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = path(request);
        Rule rule = RULES.get(path);
        long windowMs = rule.window().toMillis();
        long windowStart = System.currentTimeMillis() / windowMs;
        String key = "aviro:rl:" + path + ":" + clientIp(request) + ":" + windowStart;

        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, rule.window());
            }
            if (count != null && count > rule.maxRequests()) {
                long retryAfterSec = Math.max(1,
                        ((windowStart + 1) * windowMs - System.currentTimeMillis()) / 1000);
                log.warn("Rate limit hit: {} from {}", path, clientIp(request));
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setHeader("Retry-After", String.valueOf(retryAfterSec));
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding("UTF-8");
                long minutes = (retryAfterSec + 59) / 60;
                response.getWriter().write("{\"success\":false,\"message\":\"Too many attempts. Please try again in "
                        + minutes + (minutes == 1 ? " minute" : " minutes") + ".\"}");
                return;
            }
        } catch (Exception e) {
            // Redis down: let the request through rather than blocking all logins
            log.warn("Rate limit check failed: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String path(HttpServletRequest request) {
        return request.getRequestURI().substring(request.getContextPath().length());
    }

    private String clientIp(HttpServletRequest request) {
        // Render sits behind Cloudflare, which sets the real client IP here
        String cf = request.getHeader("CF-Connecting-IP");
        if (cf != null && !cf.isBlank()) return cf.trim();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
