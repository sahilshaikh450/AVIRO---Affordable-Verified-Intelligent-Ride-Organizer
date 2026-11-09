package com.aviro.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aviro.service.OtpService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;

class OtpServiceTest {

    private OtpService otp;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        RedisTemplate<String, Object> redis = mock(RedisTemplate.class);
        RedisConnectionFailureException down =
                new RedisConnectionFailureException("Unable to connect to Redis");
        when(redis.opsForValue()).thenThrow(down);
        when(redis.delete(any(String.class))).thenThrow(down);
        otp = new OtpService(redis);
        ReflectionTestUtils.setField(otp, "otpExpiryMinutes", 10);
        ReflectionTestUtils.setField(otp, "otpLength", 6);
        ReflectionTestUtils.invokeMethod(otp, "init");
    }

    private static String wrongFor(String code) {
        return "000000".equals(code) ? "111111" : "000000";
    }

    @Test
    void codeWorksOnceWhileRedisIsDown() {
        String code = otp.generateAndSaveOtp("a@x.in");
        assertThat(code).hasSize(6);
        assertThat(otp.verifyOtp("a@x.in", wrongFor(code))).isFalse();
        assertThat(otp.verifyOtp("a@x.in", code)).isTrue();
        assertThat(otp.verifyOtp("a@x.in", code)).isFalse();
    }

    @Test
    void fiveWrongTriesCancelTheCode() {
        String code = otp.generateAndSaveOtp("b@x.in");
        for (int i = 0; i < 5; i++) assertThat(otp.verifyOtp("b@x.in", wrongFor(code))).isFalse();
        assertThat(otp.verifyOtp("b@x.in", code)).isFalse();
    }

    @Test
    void discardedCodeStopsWorking() {
        String code = otp.generateAndSaveOtp("c@x.in");
        otp.discard("c@x.in");
        assertThat(otp.verifyOtp("c@x.in", code)).isFalse();
    }
}
