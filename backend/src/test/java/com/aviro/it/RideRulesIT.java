package com.aviro.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.aviro.entity.User;
import com.aviro.enums.VehicleType;
import com.aviro.support.IntegrationTest;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

class RideRulesIT extends IntegrationTest {

    private Map<String, Object> body(Object... kv) {
        Map<String, Object> m = new HashMap<>(rideBody(2, 30));
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    @Test
    void aStudentWithoutAVehicleCannotPostARide() throws Exception {
        User u = student("No Vehicle");
        var r = post("/rides", u, body());
        assertThat(r.status()).isEqualTo(400);
        assertThat(r.message()).contains("No vehicle");
    }

    @Test
    void anUnverifiedStudentCannotPostARide() throws Exception {
        User d = driver("Unverified Driver", VehicleType.CAR, 4);
        d.setIsCollegeVerified(false);
        users.save(d);
        assertThat(post("/rides", d, body()).message()).contains("College ID not verified");
    }

    @Test
    void aBikeTakesOneRiderAndACarUpToFour() throws Exception {
        User bike = driver("Bike Driver", VehicleType.BIKE, 1);
        assertThat(post("/rides", bike, body("totalSeats", 2)).message())
                .contains("can take 1 rider");
        assertThat(post("/rides", bike, body("totalSeats", 1)).ok()).isTrue();

        User car = driver("Car Driver", VehicleType.CAR, 4);
        assertThat(post("/rides", car, body("totalSeats", 5)).status()).isEqualTo(400);
        assertThat(post("/rides", car, body("totalSeats", 4)).ok()).isTrue();
    }

    @Test
    void autoAndVanCannotBeAddedOrPostRides() throws Exception {
        User u = student("Auto Owner");
        var r =
                post(
                        "/users/vehicle",
                        u,
                        Map.of(
                                "vehicleType",
                                "AUTO",
                                "registrationNumber",
                                "MH12AB9999",
                                "totalSeats",
                                1));
        assertThat(r.message()).contains("bikes, scooties and cars");
        User old = driver("Old Auto", VehicleType.AUTO, 3);
        assertThat(post("/rides", old, body()).message()).contains("bikes, scooties and cars");
    }

    @Test
    void timeRulesHold() throws Exception {
        User d = driver("Time Driver", VehicleType.CAR, 4);
        assertThat(
                        post(
                                        "/rides",
                                        d,
                                        body(
                                                "departureTime",
                                                LocalDateTime.now()
                                                        .minusDays(1)
                                                        .withHour(9)
                                                        .toString()))
                                .status())
                .isEqualTo(400);
        assertThat(
                        post(
                                        "/rides",
                                        d,
                                        body(
                                                "departureTime",
                                                LocalDateTime.now()
                                                        .plusDays(1)
                                                        .withHour(23)
                                                        .withMinute(0)
                                                        .toString()))
                                .message())
                .contains("Rides can leave only between");
        assertThat(
                        post(
                                        "/rides",
                                        d,
                                        body(
                                                "departureTime",
                                                LocalDateTime.now()
                                                        .plusDays(45)
                                                        .withHour(9)
                                                        .withMinute(0)
                                                        .toString()))
                                .message())
                .contains("days ahead");
    }

    @Test
    void priceAndTextAreChecked() throws Exception {
        User d = driver("Price Driver", VehicleType.CAR, 4);
        assertThat(post("/rides", d, body("pricePerSeat", 2)).status()).isEqualTo(400);
        assertThat(post("/rides", d, body("pricePerSeat", 999999)).status()).isEqualTo(400);
        assertThat(post("/rides", d, body("toLocation", "<img src=x onerror=alert(1)>")).status())
                .isEqualTo(400);
        assertThat(post("/rides", d, body("notes", "<script>alert(1)</script>")).status())
                .isEqualTo(400);
        assertThat(post("/rides", d, body("fromLat", 999)).status()).isEqualTo(400);
    }

    @Test
    void aSplitPricePerSeatIsStoredAsSent() throws Exception {
        User d = driver("Split Driver", VehicleType.SCOOTY, 1);
        var r = post("/rides", d, body("totalSeats", 1, "pricePerSeat", 23));
        assertThat(r.ok()).isTrue();
        assertThat(r.data().path("pricePerSeat").asDouble()).isEqualTo(23.0);
        assertThat(r.data().path("availableSeats").asInt()).isEqualTo(1);
    }

    @Test
    void onlyTheDriverCanCancelTheirRide() throws Exception {
        User d = driver("Owner Driver", VehicleType.CAR, 4);
        User other = student("Someone Else");
        long id = post("/rides", d, body()).id();
        assertThat(delete("/rides/" + id, other).ok()).isFalse();
        assertThat(delete("/rides/" + id, d).ok()).isTrue();
    }

    @Test
    void strangersDoNotSeeTheDriversPhone() throws Exception {
        User d = driver("Phone Driver", VehicleType.CAR, 4);
        d.setPhone("9876543210");
        users.save(d);
        long id = post("/rides", d, body()).id();
        var view = get("/rides/" + id, student("Curious Student"));
        assertThat(view.text()).doesNotContain("9876543210");
    }
}
