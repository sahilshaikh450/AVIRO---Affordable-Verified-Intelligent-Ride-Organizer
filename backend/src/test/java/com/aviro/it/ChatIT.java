package com.aviro.it;

import com.aviro.entity.User;
import com.aviro.enums.VehicleType;
import com.aviro.support.IntegrationTest;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ChatIT extends IntegrationTest {

    @Test
    void chatOpensOnConfirmAndClosesWhenTheTripEnds() throws Exception {
        User d = driver("Chat Driver", VehicleType.CAR, 4);
        User rider = student("Chat Rider");
        long rideId = post("/rides", d, rideBody(2, 30)).id();
        long b = post("/bookings", rider, Map.of("rideId", rideId, "seatsBooked", 1)).id();
        Map<String, Object> hi = Map.of("receiverId", d.getId(), "rideId", rideId, "content", "hi", "type", "TEXT");

        assertThat(get("/chat/active", rider).data()).isEmpty();
        assertThat(post("/chat/send", rider, hi).message()).contains("confirms the ride");

        patch("/bookings/" + b + "/status", d, Map.of("status", "CONFIRMED"));
        assertThat(get("/chat/active", rider).data().get(0).path("otherName").asText()).isEqualTo("Chat Driver");
        assertThat(get("/chat/active", d).data().get(0).path("role").asText()).isEqualTo("Rider");
        assertThat(post("/chat/send", rider, hi).ok()).isTrue();
        assertThat(get("/chat/" + rideId + "/" + rider.getId(), d).data().get(0).path("content").asText()).isEqualTo("hi");
        assertThat(post("/chat/send", student("Chat Stranger"), hi).status()).isEqualTo(403);

        delete("/bookings/" + b, rider);
        assertThat(get("/chat/active", rider).data()).isEmpty();
        assertThat(post("/chat/send", rider, hi).status()).isEqualTo(400);
        assertThat(get("/chat/" + rideId + "/" + d.getId(), rider).status()).isEqualTo(400);
    }

    @Test
    void messagesHaveALengthLimit() throws Exception {
        User d = driver("Long Driver", VehicleType.CAR, 4);
        User rider = student("Long Rider");
        long rideId = post("/rides", d, rideBody(2, 30)).id();
        long b = post("/bookings", rider, Map.of("rideId", rideId, "seatsBooked", 1)).id();
        patch("/bookings/" + b + "/status", d, Map.of("status", "CONFIRMED"));
        var r = post("/chat/send", rider, Map.of("receiverId", d.getId(), "rideId", rideId, "content", "x".repeat(5000)));
        assertThat(r.status()).isEqualTo(400);
    }
}
