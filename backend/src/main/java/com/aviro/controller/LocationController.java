package com.aviro.controller;

import com.aviro.dto.response.ApiResponse;
import com.aviro.entity.Booking;
import com.aviro.repository.BookingRepository;
import com.aviro.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/location")
@RequiredArgsConstructor
@Slf4j
public class LocationController {

    private final SimpMessagingTemplate messagingTemplate;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    // ── Driver broadcasts location via WebSocket ──
    @MessageMapping("/location.update")
    public void updateLocation(@Payload Map<String, Object> payload) {
        Long bookingId = Long.valueOf(payload.get("bookingId").toString());
        Double lat     = Double.valueOf(payload.get("lat").toString());
        Double lng     = Double.valueOf(payload.get("lng").toString());
        String status  = payload.getOrDefault("status", "ON_THE_WAY").toString();

        Map<String, Object> locationData = Map.of(
            "bookingId", bookingId,
            "lat",       lat,
            "lng",       lng,
            "status",    status,
            "timestamp", System.currentTimeMillis()
        );

        // Send to rider's queue
        bookingRepository.findById(bookingId).ifPresent(booking -> {
            Long riderId = booking.getRider().getId();
            messagingTemplate.convertAndSendToUser(
                riderId.toString(),
                "/queue/location",
                locationData
            );
            log.debug("Location update sent: booking={} lat={} lng={}", bookingId, lat, lng);
        });
    }

    // ── Driver sends quick message ──
    @MessageMapping("/location.message")
    public void sendQuickMessage(@Payload Map<String, Object> payload) {
        Long bookingId = Long.valueOf(payload.get("bookingId").toString());
        String message = payload.get("message").toString();
        Long senderId  = Long.valueOf(payload.get("senderId").toString());

        bookingRepository.findById(bookingId).ifPresent(booking -> {
            Long riderId  = booking.getRider().getId();
            Long driverId = booking.getRide().getDriver().getId();
            Long targetId = senderId.equals(driverId) ? riderId : driverId;

            Map<String, Object> msgData = Map.of(
                "bookingId", bookingId,
                "message",   message,
                "senderId",  senderId,
                "timestamp", System.currentTimeMillis()
            );

            messagingTemplate.convertAndSendToUser(
                targetId.toString(),
                "/queue/quick-message",
                msgData
            );

            // Also push as notification
            try {
                notificationService.send(targetId, "New Message 💬", message, "CHAT_MESSAGE", bookingId.toString());
            } catch (Exception e) {
                log.warn("Notification failed: {}", e.getMessage());
            }
        });
    }

    // ── Driver marks arrived at pickup ──
    @PostMapping("/arrived/{bookingId}")
    public ApiResponse<String> driverArrived(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long bookingId) {

        bookingRepository.findById(bookingId).ifPresent(booking -> {
            Long riderId = booking.getRider().getId();
            try {
                notificationService.send(riderId,
                    "Driver Arrived! 🚗",
                    booking.getRide().getDriver().getFullName() + " has arrived at your pickup point!",
                    "BOOKING_ACCEPTED",
                    bookingId.toString()
                );
                // Also send via WebSocket
                messagingTemplate.convertAndSendToUser(
                    riderId.toString(),
                    "/queue/location",
                    Map.of("bookingId", bookingId, "status", "ARRIVED", "timestamp", System.currentTimeMillis())
                );
            } catch (Exception e) {
                log.warn("Arrival notification failed: {}", e.getMessage());
            }
        });

        return ApiResponse.success("Arrival notification sent!", null);
    }
}