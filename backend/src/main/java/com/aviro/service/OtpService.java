package com.aviro.service;

import com.aviro.security.TtlCache;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;

/**
 * One-time codes, kept in Redis. If Redis can't be reached, codes are kept in this
 * server's memory instead, so sign-up and password reset keep working during an outage.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${aviro.otp.expiry-minutes:10}")
    private int otpExpiryMinutes;

    @Value("${aviro.otp.length:6}")
    private int otpLength;

    private static final String OTP_PREFIX = "aviro:otp:";
    private static final String TRIES_PREFIX = "aviro:otp-tries:";
    private static final int MAX_WRONG_TRIES = 5;
    private static final SecureRandom random = new SecureRandom();

    // Fallback while Redis is down
    private TtlCache<String, String> memoryCodes;
    private TtlCache<String, Integer> memoryTries;

    @PostConstruct
    void init() {
        long ttlMs = TimeUnit.MINUTES.toMillis(otpExpiryMinutes);
        memoryCodes = new TtlCache<>(ttlMs, 10_000);
        memoryTries = new TtlCache<>(ttlMs, 10_000);
    }

    public String generateAndSaveOtp(String email) {
        String otp = generateOtp();
        memoryCodes.invalidate(email);
        memoryTries.invalidate(email);
        try {
            redisTemplate.opsForValue().set(OTP_PREFIX + email, otp, otpExpiryMinutes, TimeUnit.MINUTES);
            redisTemplate.delete(TRIES_PREFIX + email);
        } catch (Exception e) {
            log.warn("Redis unavailable, keeping OTP in memory: {}", e.getMessage());
            memoryCodes.put(email, otp);
        }
        log.info("OTP generated for: {} (expires in {} min)", email, otpExpiryMinutes);
        return otp;
    }

    public boolean verifyOtp(String email, String otp) {
        // A code saved in memory during an outage is checked there, even if Redis is back
        if (memoryCodes.getIfPresent(email) != null) return verifyInMemory(email, otp);
        try {
            return verifyInRedis(email, otp);
        } catch (Exception e) {
            log.warn("Redis unavailable while checking OTP: {}", e.getMessage());
            return false;
        }
    }

    public void discard(String email) {
        memoryCodes.invalidate(email);
        memoryTries.invalidate(email);
        try {
            redisTemplate.delete(OTP_PREFIX + email);
        } catch (Exception e) {
            log.warn("Redis unavailable while discarding OTP: {}", e.getMessage());
        }
    }

    private boolean verifyInRedis(String email, String otp) {
        String key = OTP_PREFIX + email;
        Object stored = redisTemplate.opsForValue().get(key);
        if (stored == null) return false;
        if (stored.toString().equals(otp)) {
            redisTemplate.delete(key);
            redisTemplate.delete(TRIES_PREFIX + email);
            return true;
        }
        // Too many wrong guesses: the code stops working and a new one must be requested
        Long tries = redisTemplate.opsForValue().increment(TRIES_PREFIX + email);
        redisTemplate.expire(TRIES_PREFIX + email, otpExpiryMinutes, TimeUnit.MINUTES);
        if (tries != null && tries >= MAX_WRONG_TRIES) {
            redisTemplate.delete(key);
            log.warn("OTP for {} cancelled after {} wrong tries", email, tries);
        }
        return false;
    }

    private synchronized boolean verifyInMemory(String email, String otp) {
        String stored = memoryCodes.getIfPresent(email);
        if (stored == null) return false;
        if (stored.equals(otp)) {
            memoryCodes.invalidate(email);
            memoryTries.invalidate(email);
            return true;
        }
        Integer before = memoryTries.getIfPresent(email);
        int tries = (before == null ? 0 : before) + 1;
        memoryTries.put(email, tries);
        if (tries >= MAX_WRONG_TRIES) {
            memoryCodes.invalidate(email);
            log.warn("OTP for {} cancelled after {} wrong tries", email, tries);
        }
        return false;
    }

    private String generateOtp() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < otpLength; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
}
