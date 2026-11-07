package com.aviro.it;

import com.aviro.entity.User;
import com.aviro.enums.Role;
import com.aviro.support.IntegrationTest;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AuthAccessIT extends IntegrationTest {

    @Test
    void protectedEndpointsNeedAToken() throws Exception {
        assertThat(get("/users/profile", null).status()).isIn(401, 403);
        assertThat(get("/bookings/my", null).status()).isIn(401, 403);
    }

    @Test
    void healthAndPublicShareNeedNoToken() throws Exception {
        assertThat(get("/health", null).ok()).isTrue();
        assertThat(get("/public/share/not-a-real-token", null).status()).isEqualTo(400);
    }

    @Test
    void forgedOrBrokenTokensAreRefused() throws Exception {
        User u = student("Token User");
        String good = token(u);
        String[] parts = good.split("\\.");
        String swapped = parts[0] + "." + java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"sub\":\"admin@aviro.app\",\"iat\":1,\"exp\":9999999999}").getBytes()) + "." + parts[2];
        for (String bad : new String[]{swapped, good + "x", "not.a.token"}) {
            var r = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/users/profile")
                    .header("Authorization", "Bearer " + bad)).andReturn();
            assertThat(r.getResponse().getStatus()).isIn(401, 403);
        }
    }

    @Test
    void registeringCannotGrantAdminOrVerification() throws Exception {
        var admin = post("/auth/register", null, Map.of(
                "fullName", "Evil Student", "email", "evil.admin@gmail.com", "password", "password123",
                "gender", "MALE", "role", "ADMIN", "collegeName", "PICT", "locality", "Katraj"));
        assertThat(admin.status()).isEqualTo(400);
        assertThat(users.findByEmail("evil.admin@gmail.com")).isEmpty();

        var sneaky = post("/auth/register", null, Map.of(
                "fullName", "Evil Student", "email", "evil.student@gmail.com", "password", "password123",
                "gender", "MALE", "role", "RIDER", "collegeName", "PICT", "locality", "Katraj",
                "isCollegeVerified", true, "aviroCredits", 999999));
        assertThat(sneaky.status()).as(sneaky.text()).isLessThan(300);
        User saved = users.findByEmail("evil.student@gmail.com").orElseThrow();
        assertThat(saved.getRole()).isEqualTo(Role.RIDER);
        assertThat(saved.getIsCollegeVerified()).isFalse();
        assertThat(saved.getAviroCredits()).isNotEqualTo(999999);
    }

    @Test
    void profileUpdateIgnoresRoleEmailAndCredits() throws Exception {
        User u = student("Plain Student");
        put("/users/profile", u, Map.of("role", "ADMIN", "email", "hijack@x.com", "aviroCredits", 999999));
        User after = users.findById(u.getId()).orElseThrow();
        assertThat(after.getRole()).isEqualTo(Role.BOTH);
        assertThat(after.getEmail()).isEqualTo(u.getEmail());
        assertThat(after.getAviroCredits()).isEqualTo(100);
    }

    @Test
    void adminEndpointsAreForAdminsOnly() throws Exception {
        User u = student("Not Admin");
        assertThat(get("/admin/stats", u).status()).isEqualTo(403);
        assertThat(get("/admin/safety-reports", u).status()).isEqualTo(403);
        User admin = student("Real Admin");
        admin.setRole(Role.ADMIN);
        users.save(admin);
        assertThat(get("/admin/stats", admin).ok()).isTrue();
    }

    @Test
    void badInputGivesCleanErrors() throws Exception {
        User u = student("Error Student");
        var broken = post("/rides", u, "{\"fromLocation\": ");
        assertThat(broken.status()).isEqualTo(400);
        assertThat(broken.text()).doesNotContain("Exception").doesNotContain("at com.");
        assertThat(get("/bookings/abc", u).status()).isEqualTo(400);
        assertThat(get("/bookings/99999999", u).status()).isIn(400, 404);
    }
}
