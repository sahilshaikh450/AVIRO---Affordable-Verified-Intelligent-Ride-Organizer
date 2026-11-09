package com.aviro.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aviro.entity.User;
import com.aviro.support.IntegrationTest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

class SecurityLimitsIT extends IntegrationTest {

    private static final AtomicInteger IP = new AtomicInteger(10);

    @BeforeEach
    void redisDown() {
        RedisConnectionFailureException down = new RedisConnectionFailureException("down");
        when(stringRedisTemplate.opsForValue()).thenThrow(down);
        when(stringRedisTemplate.hasKey(any())).thenThrow(down);
        when(redisTemplate.opsForValue()).thenThrow(down);
    }

    private MvcResult login(String email, String password, String ip) throws Exception {
        return mvc.perform(
                        MockMvcRequestBuilders.post("/auth/login")
                                .header("X-Forwarded-For", ip)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json.writeValueAsString(
                                                Map.of("email", email, "password", password))))
                .andReturn();
    }

    @Test
    void tenWrongPasswordsLockTheAccountEvenFromManyIps() throws Exception {
        User u = student("Lock Target");
        for (int i = 0; i < 10; i++) {
            assertThat(
                            login(u.getEmail(), "wrong-password", "10.0.0." + IP.incrementAndGet())
                                    .getResponse()
                                    .getStatus())
                    .isEqualTo(401);
        }
        MvcResult locked = login(u.getEmail(), "password123", "10.0.1." + IP.incrementAndGet());
        assertThat(locked.getResponse().getStatus()).isEqualTo(400);
        assertThat(locked.getResponse().getContentAsString()).contains("Too many wrong passwords");
    }

    @Test
    void rightPasswordClearsEarlierFailures() throws Exception {
        User u = student("Forgetful Student");
        for (int i = 0; i < 9; i++)
            login(u.getEmail(), "wrong-password", "10.0.2." + IP.incrementAndGet());
        assertThat(
                        login(u.getEmail(), "password123", "10.0.3." + IP.incrementAndGet())
                                .getResponse()
                                .getStatus())
                .isEqualTo(200);
        for (int i = 0; i < 9; i++)
            login(u.getEmail(), "wrong-password", "10.0.4." + IP.incrementAndGet());
        assertThat(
                        login(u.getEmail(), "password123", "10.0.5." + IP.incrementAndGet())
                                .getResponse()
                                .getStatus())
                .isEqualTo(200);
    }

    @Test
    void ipRateLimitStillWorksWithoutRedis() throws Exception {
        String ip = "10.9.9." + IP.incrementAndGet();
        int last = 0;
        for (int i = 0; i < 11; i++)
            last = login("nobody" + i + "@gmail.com", "x", ip).getResponse().getStatus();
        assertThat(last).isEqualTo(429);
    }

    @Test
    void spoofedForwardedForDoesNotDodgeTheIpLimit() throws Exception {
        String realIp = "10.8.8." + IP.incrementAndGet();
        int last = 0;
        for (int i = 0; i < 11; i++) {
            last =
                    login("nobody" + i + "@gmail.com", "x", "1.2.3." + i + ", " + realIp)
                            .getResponse()
                            .getStatus();
        }
        assertThat(last).isEqualTo(429);
    }

    @Test
    void logoutRevokesTheTokenWithoutRedis() throws Exception {
        User u = student("Logout Student");
        String token = token(u);
        var ok =
                mvc.perform(
                                MockMvcRequestBuilders.get("/users/profile")
                                        .header("Authorization", "Bearer " + token))
                        .andReturn();
        assertThat(ok.getResponse().getStatus()).isEqualTo(200);
        mvc.perform(
                        MockMvcRequestBuilders.post("/auth/logout")
                                .header("Authorization", "Bearer " + token))
                .andReturn();
        var after =
                mvc.perform(
                                MockMvcRequestBuilders.get("/users/profile")
                                        .header("Authorization", "Bearer " + token))
                        .andReturn();
        assertThat(after.getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void signupCodeEmailsAreThrottled() throws Exception {
        String email = "throttle" + System.nanoTime() + "@gmail.com";
        var reg =
                post(
                        "/auth/register",
                        null,
                        Map.of(
                                "fullName",
                                "Throttle Test",
                                "email",
                                email,
                                "password",
                                "password123",
                                "gender",
                                "MALE",
                                "role",
                                "RIDER",
                                "collegeName",
                                "PICT",
                                "locality",
                                "Katraj"));
        assertThat(reg.ok()).as(reg.text()).isTrue();

        var resend = post("/auth/resend-otp", null, Map.of("email", email));
        assertThat(resend.status()).isEqualTo(400);
        assertThat(resend.message()).contains("wait a minute");

        var login =
                mvc.perform(
                                MockMvcRequestBuilders.post("/auth/login")
                                        .header("X-Forwarded-For", "10.7.7." + IP.incrementAndGet())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                json.writeValueAsString(
                                                        Map.of(
                                                                "email",
                                                                email,
                                                                "password",
                                                                "password123"))))
                        .andReturn();
        assertThat(login.getResponse().getStatus()).isEqualTo(200);
        assertThat(login.getResponse().getContentAsString()).contains("just sent");
        verify(emailService, times(1)).sendVerificationEmailNow(any(), any(), any());
    }
}
