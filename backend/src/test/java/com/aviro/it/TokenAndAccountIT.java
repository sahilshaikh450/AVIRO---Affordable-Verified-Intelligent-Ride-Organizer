package com.aviro.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.aviro.entity.User;
import com.aviro.enums.VehicleType;
import com.aviro.support.IntegrationTest;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.Map;

class TokenAndAccountIT extends IntegrationTest {

    private int profileWith(String token) throws Exception {
        return mvc.perform(
                        MockMvcRequestBuilders.get("/users/profile")
                                .header("Authorization", "Bearer " + token))
                .andReturn()
                .getResponse()
                .getStatus();
    }

    @Test
    void refreshTokenCannotBeUsedAsAccessToken() throws Exception {
        User u = student("Token Mixer");
        String refresh = jwt.generateRefreshToken(u.getEmail());
        assertThat(profileWith(refresh)).isEqualTo(401);
        assertThat(profileWith(jwt.generateAccessToken(u.getEmail()))).isEqualTo(200);
    }

    @Test
    void accessTokenCannotRenewTheSession() throws Exception {
        User u = student("Forever Session");
        var r = post("/auth/refresh-token", null, Map.of("refreshToken", token(u)));
        assertThat(r.status()).isEqualTo(400);
    }

    @Test
    void refreshTokenWorksOnlyOnce() throws Exception {
        User u = student("Rotating Student");
        String refresh = jwt.generateRefreshToken(u.getEmail());
        var first = post("/auth/refresh-token", null, Map.of("refreshToken", refresh));
        assertThat(first.ok()).as(first.text()).isTrue();
        assertThat(first.data().path("accessToken").asText()).isNotBlank();
        var again = post("/auth/refresh-token", null, Map.of("refreshToken", refresh));
        assertThat(again.status()).isEqualTo(400);
    }

    @Test
    void deactivatedAccountTokensStopWorking() throws Exception {
        User u = student("Deactivated Student");
        String t = token(u);
        u.setIsActive(false);
        users.save(u);
        assertThat(profileWith(t)).isEqualTo(401);
    }

    @Test
    void deleteAccountPasswordGuessesAreLimited() throws Exception {
        User u = student("Guess Target");
        org.mockito.Mockito.when(stringRedisTemplate.opsForValue())
                .thenThrow(
                        new org.springframework.data.redis.RedisConnectionFailureException("down"));
        for (int i = 0; i < 5; i++) {
            var wrong =
                    send(
                            MockMvcRequestBuilders.delete("/users/me"),
                            u,
                            Map.of("password", "wrong-" + i));
            assertThat(wrong.message()).isEqualTo("Incorrect password");
        }
        var locked =
                send(
                        MockMvcRequestBuilders.delete("/users/me"),
                        u,
                        Map.of("password", "password123"));
        assertThat(locked.status()).isEqualTo(400);
        assertThat(locked.message()).contains("Too many wrong passwords");
        assertThat(users.findById(u.getId()).orElseThrow().getIsActive()).isTrue();
    }

    @Test
    void sharesAboveTheFuelCostCapAreRefused() throws Exception {
        User d = driver("Greedy Driver", VehicleType.CAR, 4);
        var r = post("/rides", d, rideBody(2, 900));
        assertThat(r.status()).isEqualTo(400);
        assertThat(r.message()).contains("500").contains("fuel costs");
        assertThat(post("/rides", d, rideBody(2, 120)).ok()).isTrue();
    }

    @Test
    void oldLoginOtpEndpointIsGone() throws Exception {
        var r = post("/auth/login-verify-otp", null, Map.of("email", "a@b.in", "otp", "123456"));
        assertThat(r.status()).isEqualTo(404);
    }
}
