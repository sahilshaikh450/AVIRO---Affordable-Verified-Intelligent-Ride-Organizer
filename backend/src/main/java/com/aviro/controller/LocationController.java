package com.aviro.controller;

import lombok.Data;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class LocationController {

    private final SimpMessagingTemplate messagingTemplate;

    public LocationController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // Driver sends location update -> broadcast to everyone watching this ride
    @MessageMapping("/location.update")
    public void updateLocation(@Payload LocationUpdate update) {
        messagingTemplate.convertAndSend(
            "/topic/ride." + update.getRideId() + ".location",
            update
        );
    }

    @Data
    public static class LocationUpdate {
        private Long rideId;
        private Double lat;
        private Double lng;
        private String driverName;
    }
}