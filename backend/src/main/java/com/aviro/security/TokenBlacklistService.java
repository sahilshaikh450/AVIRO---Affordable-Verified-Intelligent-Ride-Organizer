package com.aviro.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Date;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
@Slf4j
public class TokenBlacklistService {

    private static final String PREFIX = "aviro:revoked:";
    private static final String BEFORE_PREFIX = "aviro:revoked-before:";

    @Value("${aviro.jwt.refresh-expiration:604800000}")
    private long refreshExpirationMs;

    private final StringRedisTemplate redisTemplate;
    private final TtlCache<String, Boolean> knownGood = new TtlCache<>(60_000, 50_000);
    private final JwtTokenProvider jwtTokenProvider;

    public void revoke(String token) {
        if (token == null || token.isBlank() || !jwtTokenProvider.validateToken(token)) {
            return;
        }
        knownGood.invalidate(hash(token));
        try {
            Date expiry = jwtTokenProvider.getExpirationFromToken(token);
            long ttlMs = expiry.getTime() - System.currentTimeMillis();
            if (ttlMs > 0) {
                redisTemplate
                        .opsForValue()
                        .set(PREFIX + hash(token), "1", Duration.ofMillis(ttlMs));
            }
        } catch (Exception e) {
            log.warn("Could not revoke token: {}", e.getMessage());
        }
    }

    public void revokeAllFor(String email) {
        try {
            redisTemplate
                    .opsForValue()
                    .set(
                            BEFORE_PREFIX + email,
                            String.valueOf(System.currentTimeMillis()),
                            Duration.ofMillis(refreshExpirationMs));
            knownGood.clear();
        } catch (Exception e) {
            log.warn("Could not end sessions for {}: {}", email, e.getMessage());
        }
    }

    public boolean isRevoked(String token) {
        String key = hash(token);
        if (knownGood.getIfPresent(key) != null) return false;
        try {
            if (Boolean.TRUE.equals(redisTemplate.hasKey(PREFIX + key))) return true;
            String before =
                    redisTemplate
                            .opsForValue()
                            .get(BEFORE_PREFIX + jwtTokenProvider.getEmailFromToken(token));
            boolean revoked =
                    before != null
                            && jwtTokenProvider.getIssuedAtMsFromToken(token)
                                    < Long.parseLong(before);
            if (!revoked) knownGood.put(key, Boolean.TRUE);
            return revoked;
        } catch (Exception e) {
            log.warn("Token blacklist check failed: {}", e.getMessage());
            return false;
        }
    }

    private String hash(String token) {
        try {
            byte[] digest =
                    MessageDigest.getInstance("SHA-256")
                            .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
