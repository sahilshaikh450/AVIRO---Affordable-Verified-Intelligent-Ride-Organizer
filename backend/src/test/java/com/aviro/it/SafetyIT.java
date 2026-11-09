package com.aviro.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.aviro.entity.User;
import com.aviro.enums.Role;
import com.aviro.enums.VehicleType;
import com.aviro.support.IntegrationTest;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

class SafetyIT extends IntegrationTest {

    @Test
    void emergencyContactRules() throws Exception {
        User u = student("Contact Student");
        var r =
                post(
                        "/safety/emergency-contacts",
                        u,
                        Map.of(
                                "contacts",
                                List.of(
                                        " Mom@Example.com ",
                                        "mom@example.com",
                                        "dad@example.com")));
        assertThat(r.data().toString()).isEqualTo("[\"mom@example.com\",\"dad@example.com\"]");
        assertThat(
                        post(
                                        "/safety/emergency-contacts",
                                        u,
                                        Map.of("contacts", List.of(u.getEmail())))
                                .message())
                .contains("not your own");
        assertThat(
                        post(
                                        "/safety/emergency-contacts",
                                        u,
                                        Map.of(
                                                "contacts",
                                                List.of(
                                                        "a@x.com", "b@x.com", "c@x.com",
                                                        "d@x.com")))
                                .message())
                .contains("up to 3");
        put(
                "/users/profile",
                u,
                Map.of("emergencyContacts", List.of("spam1", "spam2", "spam3", "spam4")));
        assertThat(get("/safety/emergency-contacts", u).data().toString()).doesNotContain("spam");
    }

    @Test
    void sharedTripLinkWorksWithoutAnAccountAndHidesContactDetails() throws Exception {
        User d = driver("Share Driver", VehicleType.CAR, 4);
        d.setPhone("9876543210");
        users.save(d);
        User rider = student("Share Rider");
        long rideId = post("/rides", d, rideBody(2, 30)).id();
        long b = post("/bookings", rider, Map.of("rideId", rideId, "seatsBooked", 1)).id();
        assertThat(post("/safety/share-ride/" + b, rider, Map.of()).message())
                .contains("once the driver accepts");
        patch("/bookings/" + b + "/status", d, Map.of("status", "CONFIRMED"));
        assertThat(post("/safety/share-ride/" + b, student("Share Stranger"), Map.of()).status())
                .isEqualTo(403);

        String link = post("/safety/share-ride/" + b, rider, Map.of()).data().path("link").asText();
        String tokenPart = link.substring(link.lastIndexOf('/') + 1);
        var pub = get("/public/share/" + tokenPart, null);
        assertThat(pub.ok()).isTrue();
        assertThat(pub.data().path("live").asBoolean()).isTrue();
        assertThat(pub.data().path("vehicle").path("plate").asText()).startsWith("MH12AB");
        assertThat(pub.text()).doesNotContain("@").doesNotContain("9876543210");

        delete("/bookings/" + b, rider);
        assertThat(get("/public/share/" + tokenPart, null).data().path("live").asBoolean())
                .isFalse();
    }

    @Test
    void reportsAreSavedAndOnlyAdminsSeeThem() throws Exception {
        User d = driver("Report Driver", VehicleType.CAR, 4);
        User rider = student("Report Rider");
        long rideId = post("/rides", d, rideBody(2, 30)).id();
        long b = post("/bookings", rider, Map.of("rideId", rideId, "seatsBooked", 1)).id();
        patch("/bookings/" + b + "/status", d, Map.of("status", "CONFIRMED"));

        assertThat(post("/safety/report/" + b, rider, Map.of("reason", "Made up")).status())
                .isEqualTo(400);
        assertThat(
                        post(
                                        "/safety/report/" + b,
                                        rider,
                                        Map.of("reason", "Other", "details", "short"))
                                .message())
                .contains("at least 10");
        assertThat(
                        post(
                                        "/safety/report/" + b,
                                        rider,
                                        Map.of("reason", "Rash or unsafe driving"))
                                .ok())
                .isTrue();
        assertThat(
                        post(
                                        "/safety/report/" + b,
                                        rider,
                                        Map.of("reason", "Rash or unsafe driving"))
                                .message())
                .contains("already reported");
        assertThat(
                        post(
                                        "/safety/report/" + b,
                                        student("Report Stranger"),
                                        Map.of("reason", "Unsafe vehicle"))
                                .status())
                .isEqualTo(403);

        assertThat(get("/admin/safety-reports", rider).status()).isEqualTo(403);
        User admin = student("Safety Admin");
        admin.setRole(Role.ADMIN);
        users.save(admin);
        var list = get("/admin/safety-reports", admin).data();
        assertThat(list.toString()).contains("Rash or unsafe driving").contains("Report Driver");
    }

    @Test
    void sosSaysWhoWasActuallyAlerted() throws Exception {
        User lonely = student("Lonely Student");
        var r = post("/safety/sos", lonely, Map.of());
        assertThat(r.data().path("contactsEmailed").asInt()).isZero();
        assertThat(r.message()).contains("no emergency contacts");

        User careful = student("Careful Student");
        post(
                "/safety/emergency-contacts",
                careful,
                Map.of("contacts", List.of("mom@example.com", "dad@example.com")));
        r = post("/safety/sos", careful, Map.of("lat", 18.5, "lng", 73.8));
        assertThat(r.data().path("contactsEmailed").asInt()).isEqualTo(2);
    }
}
