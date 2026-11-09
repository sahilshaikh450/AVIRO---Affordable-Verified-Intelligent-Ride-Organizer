package com.aviro.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.aviro.entity.User;
import com.aviro.enums.VehicleType;
import com.aviro.support.IntegrationTest;

import org.junit.jupiter.api.Test;

import java.util.Map;

class GuidelinesIT extends IntegrationTest {

    private User withoutGuidelines(User u) {
        u.setGuidelinesAcceptedAt(null);
        u.setGuidelinesVersion(null);
        return users.save(u);
    }

    @Test
    void existingUserMustAcceptBeforePostingOrBooking() throws Exception {
        User driver = withoutGuidelines(driver("Old Driver", VehicleType.CAR, 4));
        var profile = get("/users/profile", driver);
        assertThat(profile.data().path("guidelinesVersion").isNull()).isTrue();

        var refused = post("/rides", driver, rideBody(2, 40));
        assertThat(refused.status()).isEqualTo(400);
        assertThat(refused.message()).contains("community guidelines");

        var notTicked =
                post(
                        "/users/guidelines",
                        driver,
                        Map.of(
                                "acceptedGuidelines",
                                false,
                                "guidelinesVersion",
                                GUIDELINES_VERSION));
        assertThat(notTicked.status()).isEqualTo(400);

        var accepted =
                post(
                        "/users/guidelines",
                        driver,
                        Map.of(
                                "acceptedGuidelines",
                                true,
                                "guidelinesVersion",
                                GUIDELINES_VERSION));
        assertThat(accepted.ok()).as(accepted.text()).isTrue();
        assertThat(accepted.data().path("guidelinesVersion").asText())
                .isEqualTo(GUIDELINES_VERSION);

        var ride = post("/rides", driver, rideBody(2, 40));
        assertThat(ride.ok()).as(ride.text()).isTrue();

        User rider = withoutGuidelines(student("Old Rider"));
        var booking = post("/bookings", rider, Map.of("rideId", ride.id(), "seatsBooked", 1));
        assertThat(booking.status()).isEqualTo(400);
        assertThat(booking.message()).contains("community guidelines");
    }
}
