package com.aviro.controller;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class LiveTrackingController {

    private final SimpMessagingTemplate messagingTemplate;

    // Driver sends location updates via WebSocket
    @MessageMapping("/track.update")
    public void updateLocation(@Payload LocationUpdate update) {
        // Broadcast to all riders subscribed to this ride's tracking topic
        messagingTemplate.convertAndSend(
                "/topic/track/" + update.getRideId(),
                update
        );
    }

    // SOS alert
    @MessageMapping("/sos.alert")
    public void sosAlert(@Payload SosPayload sos) {
        messagingTemplate.convertAndSend("/topic/sos/" + sos.getRideId(), sos);
        // TODO: integrate SMS via Twilio for emergency contacts
    }

    @Data
    public static class LocationUpdate {
        private Long rideId;
        private Long driverId;
        private Double lat;
        private Double lng;
        private Double speed;
        private Long timestamp;
    }

    @Data
    public static class SosPayload {
        private Long rideId;
        private Long userId;
        private Double lat;
        private Double lng;
        private String message;
    }
}
