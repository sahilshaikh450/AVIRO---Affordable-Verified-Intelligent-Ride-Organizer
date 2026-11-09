package com.aviro.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aviro.entity.User;
import com.aviro.support.IntegrationTest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.RedisConnectionFailureException;

import java.util.Map;

class SignupOtpIT extends IntegrationTest {

    @BeforeEach
    void otpsInMemory() {
        when(redisTemplate.opsForValue()).thenThrow(new RedisConnectionFailureException("down"));
    }

    private Map<String, Object> form(String email) {
        return Map.of(
                "fullName",
                "New Student",
                "email",
                email,
                "password",
                "password123",
                "gender",
                "FEMALE",
                "role",
                "RIDER",
                "collegeName",
                "MIT World Peace University",
                "locality",
                "Kothrud");
    }

    private String lastCodeSentTo(String email) {
        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(emailService, atLeastOnce())
                .sendVerificationEmailNow(eq(email), any(), code.capture());
        return code.getValue();
    }

    @Test
    void collegeEmailIsVerifiedOnlyAfterTheCode() throws Exception {
        String email = "fake.student" + System.nanoTime() + "@mitwpu.edu.in";
        var reg = post("/auth/register", null, form(email));
        assertThat(reg.ok()).as(reg.text()).isTrue();
        assertThat(
                        reg.data().path("accessToken").isMissingNode()
                                || reg.data().path("accessToken").isNull())
                .isTrue();
        User saved = users.findByEmail(email).orElseThrow();
        assertThat(saved.getIsVerified()).isFalse();
        assertThat(saved.getIsCollegeVerified()).isFalse();

        var login = post("/auth/login", null, Map.of("email", email, "password", "password123"));
        assertThat(login.ok()).isTrue();
        assertThat(
                        login.data().path("accessToken").isNull()
                                || login.data().path("accessToken").isMissingNode())
                .isTrue();
        assertThat(login.message()).contains("verify your email");

        String code = lastCodeSentTo(email);
        String wrong = "000000".equals(code) ? "111111" : "000000";
        assertThat(post("/auth/verify-otp", null, Map.of("email", email, "otp", wrong)).status())
                .isEqualTo(400);

        var ok = post("/auth/verify-otp", null, Map.of("email", email, "otp", code));
        assertThat(ok.ok()).as(ok.text()).isTrue();
        assertThat(ok.data().path("accessToken").asText()).isNotBlank();
        User verified = users.findByEmail(email).orElseThrow();
        assertThat(verified.getIsVerified()).isTrue();
        assertThat(verified.getIsCollegeVerified()).isTrue();

        assertThat(post("/auth/verify-otp", null, Map.of("email", email, "otp", code)).status())
                .isEqualTo(400);
        var again = post("/auth/login", null, Map.of("email", email, "password", "password123"));
        assertThat(again.data().path("accessToken").asText()).isNotBlank();
    }

    @Test
    void gmailUserIsVerifiedButNotCollegeVerified() throws Exception {
        String email = "someone" + System.nanoTime() + "@gmail.com";
        post("/auth/register", null, form(email));
        var ok =
                post(
                        "/auth/verify-otp",
                        null,
                        Map.of("email", email, "otp", lastCodeSentTo(email)));
        assertThat(ok.ok()).isTrue();
        User u = users.findByEmail(email).orElseThrow();
        assertThat(u.getIsVerified()).isTrue();
        assertThat(u.getIsCollegeVerified()).isFalse();
    }

    @Test
    void noAccountWhenTheEmailCannotBeSent() throws Exception {
        when(emailService.sendVerificationEmailNow(any(), any(), any())).thenReturn(false);
        String email = "unlucky" + System.nanoTime() + "@gmail.com";
        var reg = post("/auth/register", null, form(email));
        assertThat(reg.status()).isEqualTo(400);
        assertThat(reg.message()).contains("couldn't send");
        assertThat(users.findByEmail(email)).isEmpty();
    }

    @Test
    void resendGivesTheSameReplyForUnknownEmails() throws Exception {
        var r =
                post(
                        "/auth/resend-otp",
                        null,
                        Map.of("email", "nobody" + System.nanoTime() + "@gmail.com"));
        assertThat(r.ok()).isTrue();
        assertThat(r.message()).contains("If this email");
    }
}
