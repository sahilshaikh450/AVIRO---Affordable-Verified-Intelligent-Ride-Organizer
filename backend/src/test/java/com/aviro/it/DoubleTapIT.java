package com.aviro.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.aviro.entity.User;
import com.aviro.enums.BookingStatus;
import com.aviro.enums.VehicleType;
import com.aviro.repository.BookingRepository;
import com.aviro.repository.RideRepository;
import com.aviro.support.IntegrationTest;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

class DoubleTapIT extends IntegrationTest {

    @Autowired BookingRepository bookings;
    @Autowired RideRepository rides;

    private List<Res> together(int times, Callable<Res> call) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(times);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Res>> futures = new ArrayList<>();
        for (int i = 0; i < times; i++) {
            futures.add(
                    pool.submit(
                            () -> {
                                start.await();
                                return call.call();
                            }));
        }
        start.countDown();
        List<Res> results = new ArrayList<>();
        for (Future<Res> f : futures) {
            results.add(f.get());
        }
        pool.shutdown();
        return results;
    }

    private long successes(List<Res> results) {
        return results.stream().filter(Res::ok).count();
    }

    @Test
    void tappingBookManyTimesCreatesOneBooking() throws Exception {
        User d = driver("Tap Driver", VehicleType.CAR, 4);
        User rider = student("Tap Rider");
        long rideId = post("/rides", d, rideBody(4, 30)).id();

        List<Res> results =
                together(
                        4,
                        () -> post("/bookings", rider, Map.of("rideId", rideId, "seatsBooked", 1)));

        assertThat(successes(results)).isEqualTo(1);
        assertThat(rides.findById(rideId).orElseThrow().getAvailableSeats()).isEqualTo(3);
    }

    @Test
    void cancelAndDeclineAtOnceReturnTheSeatOnce() throws Exception {
        User d = driver("Race Driver", VehicleType.CAR, 4);
        User keeper = student("Seat Keeper");
        User rider = student("Race Rider");
        long rideId = post("/rides", d, rideBody(3, 30)).id();
        assertThat(post("/bookings", keeper, Map.of("rideId", rideId, "seatsBooked", 1)).ok())
                .isTrue();
        long b = post("/bookings", rider, Map.of("rideId", rideId, "seatsBooked", 1)).id();

        List<Res> results =
                together(
                        4,
                        () ->
                                Math.random() < 0.5
                                        ? delete("/bookings/" + b, rider)
                                        : patch(
                                                "/bookings/" + b + "/status",
                                                d,
                                                Map.of("status", "REJECTED")));

        assertThat(successes(results)).isEqualTo(1);
        assertThat(rides.findById(rideId).orElseThrow().getAvailableSeats()).isEqualTo(2);
        assertThat(bookings.findById(b).orElseThrow().getStatus())
                .isIn(BookingStatus.CANCELLED, BookingStatus.REJECTED);
    }

    @Test
    void postingTheSameRideTwiceAtOnceCreatesOneRide() throws Exception {
        User d = driver("Double Post Driver", VehicleType.CAR, 4);
        Map<String, Object> body = rideBody(2, 30);

        List<Res> results = together(3, () -> post("/rides", d, body));

        assertThat(successes(results)).isEqualTo(1);
    }
}
