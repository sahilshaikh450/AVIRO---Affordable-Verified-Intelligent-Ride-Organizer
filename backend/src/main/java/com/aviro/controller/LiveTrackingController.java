package com.aviro.controller;

import com.aviro.repository.RideRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequiredArgsConstructor
@Slf4j
public class LiveTrackingController {

    private final SimpMessagingTemplate messagingTemplate;
    private final RideRepository rideRepository;

    // Driver sends location updates via WebSocket
    @MessageMapping("/track.update")
    public void updateLocation(@Payload LocationUpdate update, Principal principal) {
        Long userId = principalId(principal);
        Long driverId = rideRepository.findDriverIdByRideId(update.getRideId()).orElse(null);
        if (userId == null || !userId.equals(driverId)) {
            log.warn("Rejected track.update for ride {} from user {}", update.getRideId(), userId);
            return;
        }
        update.setDriverId(userId);
        // Broadcast to all riders subscribed to this ride's tracking topic
        messagingTemplate.convertAndSend(
                "/topic/track/" + update.getRideId(),
                update
        );
    }

    // SOS alert
    @MessageMapping("/sos.alert")
    public void sosAlert(@Payload SosPayload sos, Principal principal) {
        Long userId = principalId(principal);
        if (userId == null) {
            log.warn("Rejected SOS from unauthenticated WebSocket session");
            return;
        }
        sos.setUserId(userId);
        messagingTemplate.convertAndSend("/topic/sos/" + sos.getRideId(), sos);
        // TODO: integrate SMS via Twilio for emergency contacts
    }

    private Long principalId(Principal principal) {
        return principal == null ? null : Long.valueOf(principal.getName());
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
