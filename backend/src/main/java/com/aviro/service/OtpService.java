package com.aviro.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;

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

    public String generateAndSaveOtp(String email) {
        String otp = generateOtp();
        String key = OTP_PREFIX + email;
        redisTemplate.opsForValue().set(key, otp, otpExpiryMinutes, TimeUnit.MINUTES);
        redisTemplate.delete(TRIES_PREFIX + email);
        log.info("OTP generated for: {} (expires in {} min)", email, otpExpiryMinutes);
        return otp;
    }

    public boolean verifyOtp(String email, String otp) {
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

    public void discard(String email) {
        redisTemplate.delete(OTP_PREFIX + email);
    }

    private String generateOtp() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < otpLength; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
}
