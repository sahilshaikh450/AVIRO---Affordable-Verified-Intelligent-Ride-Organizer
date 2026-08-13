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
    private static final SecureRandom random = new SecureRandom();

    public String generateAndSaveOtp(String email) {
        String otp = generateOtp();
        String key = OTP_PREFIX + email;
        redisTemplate.opsForValue().set(key, otp, otpExpiryMinutes, TimeUnit.MINUTES);
        log.info("OTP generated for email: {} (expires in {} min) -- OTP: {}", email, otpExpiryMinutes, otp);
        return otp;
    }

    public boolean verifyOtp(String email, String otp) {
        String key = OTP_PREFIX + email;
        Object stored = redisTemplate.opsForValue().get(key);
        if (stored != null && stored.toString().equals(otp)) {
            redisTemplate.delete(key);
            return true;
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
