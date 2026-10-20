package com.aviro.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Date;
import java.util.HexFormat;

/**
 * Revoked JWTs (after logout) are kept in Redis until they would have expired anyway.
 * Only a SHA-256 hash of the token is stored.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TokenBlacklistService {

    private static final String PREFIX = "aviro:revoked:";

    private final StringRedisTemplate redisTemplate;
    private final JwtTokenProvider jwtTokenProvider;

    public void revoke(String token) {
        if (token == null || token.isBlank() || !jwtTokenProvider.validateToken(token)) {
            return;
        }
        try {
            Date expiry = jwtTokenProvider.getExpirationFromToken(token);
            long ttlMs = expiry.getTime() - System.currentTimeMillis();
            if (ttlMs > 0) {
                redisTemplate.opsForValue().set(PREFIX + hash(token), "1", Duration.ofMillis(ttlMs));
            }
        } catch (Exception e) {
            log.warn("Could not revoke token: {}", e.getMessage());
        }
    }

    public boolean isRevoked(String token) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(PREFIX + hash(token)));
        } catch (Exception e) {
            // Redis down: don't lock everyone out
            log.warn("Token blacklist check failed: {}", e.getMessage());
            return false;
        }
    }

    private String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
