package com.aviro.it;

import com.aviro.entity.User;
import com.aviro.enums.VehicleType;
import com.aviro.repository.BookingRepository;
import com.aviro.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class BookingFlowIT extends IntegrationTest {

    @Autowired BookingRepository bookings;

    private long ride(User driver, int seats) throws Exception {
        return post("/rides", driver, rideBody(seats, 30)).id();
    }

    private long book(User rider, long rideId) throws Exception {
        var r = post("/bookings", rider, Map.of("rideId", rideId, "seatsBooked", 1));
        assertThat(r.ok()).as(r.text()).isTrue();
        return r.id();
    }

    @Test
    void fullTripFromBookingToCompletion() throws Exception {
        User d = driver("Trip Driver", VehicleType.CAR, 4);
        User rider = student("Trip Rider");
        long rideId = ride(d, 2);
        long b = book(rider, rideId);
        assertThat(get("/bookings/" + b, rider).data().path("status").asText()).isEqualTo("REQUESTED");
        assertThat(get("/bookings/" + b, rider).data().path("totalAmount").asDouble()).isEqualTo(30.0);

        // Rider can't accept their own request; the driver can
        assertThat(patch("/bookings/" + b + "/status", rider, Map.of("status", "CONFIRMED")).ok()).isFalse();
        assertThat(patch("/bookings/" + b + "/status", d, Map.of("status", "CONFIRMED")).ok()).isTrue();

        // The start OTP is for the rider's eyes only
        assertThat(get("/bookings/" + b + "/ride-otp", d).ok()).isFalse();
        String otp = get("/bookings/" + b + "/ride-otp", rider).data().path("otp").asText();
        assertThat(otp).matches("\\d{4}");

        // Can't end a trip that hasn't started
        assertThat(patch("/bookings/" + b + "/status", d, Map.of("status", "COMPLETED")).ok()).isFalse();

        patch("/bookings/" + b + "/trip", d, Map.of("stage", "ON_THE_WAY"));
        patch("/bookings/" + b + "/trip", d, Map.of("stage", "ARRIVED"));
        String wrong = otp.equals("0000") ? "1111" : "0000";
        assertThat(post("/bookings/" + b + "/verify-ride-otp", d, Map.of("otp", wrong)).ok()).isFalse();
        assertThat(post("/bookings/" + b + "/verify-ride-otp", rider, Map.of("otp", otp)).ok()).isFalse();
        assertThat(post("/bookings/" + b + "/verify-ride-otp", d, Map.of("otp", otp)).ok()).isTrue();
        assertThat(get("/bookings/" + b, rider).data().path("tripStage").asText()).isEqualTo("STARTED");

        assertThat(patch("/bookings/" + b + "/status", d, Map.of("status", "COMPLETED")).ok()).isTrue();
        assertThat(get("/bookings/" + b, rider).data().path("status").asText()).isEqualTo("COMPLETED");
    }

    @Test
    void bookingRulesHold() throws Exception {
        User d = driver("Rules Driver", VehicleType.CAR, 4);
        User rider = student("Rules Rider");
        long rideId = ride(d, 2);
        assertThat(post("/bookings", d, Map.of("rideId", rideId, "seatsBooked", 1)).ok()).as("driver books own ride").isFalse();
        for (int seats : new int[]{0, -1, 50}) {
            assertThat(post("/bookings", rider, Map.of("rideId", rideId, "seatsBooked", seats)).status()).isEqualTo(400);
        }
        long b = book(rider, rideId);
        assertThat(post("/bookings", rider, Map.of("rideId", rideId, "seatsBooked", 1)).ok()).as("double booking").isFalse();
        var priced = post("/bookings", student("Cheap Rider"), Map.of("rideId", rideId, "seatsBooked", 1, "totalAmount", 1));
        assertThat(priced.data().path("totalAmount").asDouble()).as("client-set price ignored").isEqualTo(30.0);
        assertThat(get("/bookings/" + b, student("Stranger")).ok()).as("stranger reads booking").isFalse();
        assertThat(get("/bookings/ride/" + rideId, rider).ok()).as("rider lists other riders").isFalse();
        assertThat(delete("/bookings/" + b, student("Stranger Two")).ok()).as("stranger cancels").isFalse();
    }

    @Test
    void theLastSeatGoesToExactlyOneRider() throws Exception {
        User d = driver("Seat Driver", VehicleType.SCOOTY, 1);
        long rideId = ride(d, 1);
        int won = 0;
        for (int i = 0; i < 5; i++) {
            if (post("/bookings", student("Seat Rider " + i), Map.of("rideId", rideId, "seatsBooked", 1)).ok()) won++;
        }
        assertThat(won).isEqualTo(1);
        assertThat(get("/rides/" + rideId, d).data().path("availableSeats").asInt()).isZero();
    }

    @Test
    void cancellingGivesTheSeatBack() throws Exception {
        User d = driver("Return Driver", VehicleType.CAR, 4);
        User rider = student("Return Rider");
        long rideId = ride(d, 1);
        long b = book(rider, rideId);
        assertThat(get("/rides/" + rideId, d).data().path("availableSeats").asInt()).isZero();
        assertThat(delete("/bookings/" + b, rider).ok()).isTrue();
        assertThat(get("/rides/" + rideId, d).data().path("availableSeats").asInt()).isEqualTo(1);
    }
}
