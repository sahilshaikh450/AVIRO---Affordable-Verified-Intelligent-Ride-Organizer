package com.aviro.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.aviro.entity.User;
import com.aviro.enums.VehicleType;
import com.aviro.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

class NearbySearchIT extends IntegrationTest {

    private static final double PICKUP_LAT = 18.5074;
    private static final double PICKUP_LNG = 73.8077;

    private JsonNode find(long rideId, Res res) {
        for (JsonNode r : res.data()) {
            if (r.path("id").asLong() == rideId) return r;
        }
        return null;
    }

    private Res search(String from, Double lat, Double lng) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("fromLocation", from);
        body.put("toLocation", "MIT World Peace University");
        body.put("seatsNeeded", 1);
        if (lat != null) {
            body.put("fromLat", lat);
            body.put("fromLng", lng);
        }
        return post("/rides/search", student("Searching Rider"), body);
    }

    @Test
    void ridesWithin500MetresShowUpEvenWhenTheNamesDiffer() throws Exception {
        User d = driver("Nearby Driver", VehicleType.CAR, 4);
        Map<String, Object> ride = new HashMap<>(rideBody(3, 60));
        ride.put("fromLocation", "Kothrud Depot Gate " + System.nanoTime());
        ride.put("fromLat", PICKUP_LAT);
        ride.put("fromLng", PICKUP_LNG);
        long rideId = post("/rides", d, ride).id();
        assertThat(rideId).isPositive();

        Res near = search("Lane 5, Mayur Colony", PICKUP_LAT + 0.0027, PICKUP_LNG);
        JsonNode hit = find(rideId, near);
        assertThat(hit).as(near.text()).isNotNull();
        assertThat(hit.path("pickupDistanceMeters").asInt()).isBetween(250, 350);

        Res far = search("Lane 5, Mayur Colony", PICKUP_LAT + 0.0108, PICKUP_LNG);
        assertThat(find(rideId, far)).isNull();

        Res nameOnly = search("Lane 5, Mayur Colony", null, null);
        assertThat(find(rideId, nameOnly)).isNull();
    }

    @Test
    void searchingByNameStillWorksWithoutCoordinates() throws Exception {
        User d = driver("Named Driver", VehicleType.CAR, 4);
        String place = "Karve Nagar Chowk " + System.nanoTime();
        Map<String, Object> ride = new HashMap<>(rideBody(3, 60));
        ride.put("fromLocation", place);
        long rideId = post("/rides", d, ride).id();
        Res res = search(place, null, null);
        assertThat(find(rideId, res)).isNotNull();
    }
}
