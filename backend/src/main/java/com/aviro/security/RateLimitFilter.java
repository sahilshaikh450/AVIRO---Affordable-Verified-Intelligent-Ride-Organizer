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

    private static final Map<String, Rule> RULES = Map.ofEntries(
            Map.entry("/auth/login",                    new Rule(10, Duration.ofMinutes(1))),
            Map.entry("/auth/register",                 new Rule(5,  Duration.ofMinutes(10))),
            Map.entry("/auth/forgot-password",          new Rule(3,  Duration.ofMinutes(10))),
            Map.entry("/auth/resend-otp",               new Rule(3,  Duration.ofMinutes(10))),
            Map.entry("/auth/send-college-email-otp",   new Rule(3,  Duration.ofMinutes(10))),
            Map.entry("/auth/reset-password",           new Rule(10, Duration.ofMinutes(10))),
            Map.entry("/auth/verify-otp",               new Rule(10, Duration.ofMinutes(10))),
            Map.entry("/auth/login-verify-otp",         new Rule(10, Duration.ofMinutes(10))),
            Map.entry("/auth/verify-college-email-otp", new Rule(10, Duration.ofMinutes(10))),
            Map.entry("/auth/refresh-token",            new Rule(30, Duration.ofMinutes(1))),
            // Signed-in actions: counted per account, generous enough for normal use
            Map.entry("/rides",                         new Rule(20, Duration.ofHours(1))),
            Map.entry("/bookings",                      new Rule(30, Duration.ofHours(1))),
            Map.entry("/chat/send",                     new Rule(60, Duration.ofMinutes(1))),
            Map.entry("/reviews",                       new Rule(20, Duration.ofHours(1))),
            Map.entry("/users/upload-college-id",       new Rule(10, Duration.ofHours(1)))
    );

    // Every /safety/... call (SOS, share link, report) sends emails, so it shares one budget
    private static final String SAFETY_PREFIX = "/safety/";
    private static final Rule SAFETY_RULE = new Rule(10, Duration.ofMinutes(10));

    private final StringRedisTemplate redisTemplate;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equalsIgnoreCase(request.getMethod()) || ruleFor(path(request)) == null;
    }

    private Rule ruleFor(String path) {
        Rule rule = RULES.get(path);
        return rule != null ? rule : path.startsWith(SAFETY_PREFIX) ? SAFETY_RULE : null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = path(request);
        Rule rule = ruleFor(path);
        String bucket = path.startsWith(SAFETY_PREFIX) ? SAFETY_PREFIX : path;
        long windowMs = rule.window().toMillis();
        long windowStart = System.currentTimeMillis() / windowMs;
        String key = "aviro:rl:" + bucket + ":" + caller(request) + ":" + windowStart;

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

    // Signed-in calls count per token, so students sharing college Wi-Fi don't block each other
    private String caller(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ") && auth.length() > 40) {
            return "t" + Integer.toHexString(auth.hashCode()) + auth.substring(auth.length() - 12);
        }
        return clientIp(request);
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
