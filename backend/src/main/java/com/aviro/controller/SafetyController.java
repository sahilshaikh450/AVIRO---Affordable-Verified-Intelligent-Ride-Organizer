package com.aviro.controller;

import com.aviro.dto.response.ApiResponse;
import com.aviro.entity.User;
import com.aviro.repository.BookingRepository;
import com.aviro.repository.UserRepository;
import com.aviro.service.EmailService;
import com.aviro.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/safety")
@RequiredArgsConstructor
@Slf4j
public class SafetyController {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    // ── 1. Save Emergency Contacts ──────────────────────────────
    @PostMapping("/emergency-contacts")
    public ResponseEntity<ApiResponse<String>> saveEmergencyContacts(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // ✅ Handle both List<String> and comma-separated String from frontend
        List<String> contactList = new ArrayList<>();

        Object contactsObj = body.get("contacts");
        if (contactsObj instanceof List<?> list) {
            // Frontend sent JSON array: ["email1", "email2"]
            for (Object item : list) {
                if (item != null && !item.toString().trim().isEmpty()) {
                    contactList.add(item.toString().trim());
                }
            }
        } else if (contactsObj instanceof String str) {
            // Frontend sent comma-separated string: "email1,email2"
            for (String c : str.split(",")) {
                if (!c.trim().isEmpty()) {
                    contactList.add(c.trim());
                }
            }
        }

        // ✅ setEmergencyContacts expects List<String>
        user.setEmergencyContacts(contactList);
        userRepository.save(user);

        log.info("Emergency contacts updated for: {} — {} contacts saved",
            userDetails.getUsername(), contactList.size());
        return ResponseEntity.ok(ApiResponse.success(
            "Emergency contacts saved! (" + contactList.size() + " contacts)", null));
    }

    // ── 2. SOS Alert ─────────────────────────────────────────────
    @PostMapping("/sos")
    public ResponseEntity<ApiResponse<String>> sendSOS(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Long   bookingId = body.get("bookingId") != null
                ? Long.valueOf(body.get("bookingId").toString()) : null;
        Double lat = body.get("lat") != null ? Double.valueOf(body.get("lat").toString()) : null;
        Double lng = body.get("lng") != null ? Double.valueOf(body.get("lng").toString()) : null;

        String mapsLink = (lat != null && lng != null)
                ? "https://maps.google.com/?q=" + lat + "," + lng
                : "Location unavailable";

        String sosMessage = "🆘 SOS ALERT from " + user.getFullName() +
                "!\nPhone: " + (user.getPhone() != null ? user.getPhone() : "N/A") +
                "\nLocation: " + mapsLink +
                "\nPlease check on them immediately!";

        // Notify driver/rider in booking via WebSocket
        if (bookingId != null) {
            bookingRepository.findById(bookingId).ifPresent(booking -> {
                Long driverId = booking.getRide().getDriver().getId();
                Long riderId  = booking.getRider().getId();
                Long targetId = user.getId().equals(driverId) ? riderId : driverId;

                try {
                    notificationService.send(targetId,
                        "🆘 SOS EMERGENCY ALERT!",
                        user.getFullName() + " needs help! Location: " + mapsLink,
                        "SOS_ALERT",
                        bookingId.toString()
                    );
                } catch (Exception e) {
                    log.warn("SOS WebSocket notification failed: {}", e.getMessage());
                }
            });
        }

        // ✅ emergencyContacts is List<String> — iterate directly, no split()
        List<String> contacts = user.getEmergencyContacts();
        if (contacts != null && !contacts.isEmpty()) {
            for (String contact : contacts) {
                String email = contact.trim();
                if (email.contains("@")) {
                    try {
                        emailService.sendSosAlert(email, user.getFullName(), sosMessage);
                        log.info("SOS email sent to: {}", email);
                    } catch (Exception e) {
                        log.warn("SOS email failed for {}: {}", email, e.getMessage());
                    }
                }
            }
        } else {
            log.warn("SOS triggered but no emergency contacts saved for user: {}", user.getEmail());
        }

        log.warn("🆘 SOS triggered by: {} at {}", user.getEmail(), mapsLink);
        return ResponseEntity.ok(ApiResponse.success(
            "🆘 SOS alert sent to all emergency contacts!", null));
    }

    // ── 3. Share Ride Link ────────────────────────────────────────
    @PostMapping("/share-ride/{bookingId}")
    public ResponseEntity<ApiResponse<String>> shareRide(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long bookingId,
            @RequestBody Map<String, String> body) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String shareEmail    = body.get("email");
        String trackingLink  = "https://aviro-ride-sharing.vercel.app/tracking/" + bookingId;

        if (shareEmail == null || !shareEmail.contains("@")) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid email address"));
        }

        bookingRepository.findById(bookingId).ifPresent(booking -> {
            try {
                String message = user.getFullName() + " is on a ride from " +
                        booking.getRide().getFromLocation() + " to " +
                        booking.getRide().getToLocation() +
                        ".\n\nTrack their live location: " + trackingLink +
                        "\n\nStay safe! — AVIRO";

                emailService.sendRideShareAlert(shareEmail, user.getFullName(), message);
                log.info("Ride share sent to: {}", shareEmail);
            } catch (Exception e) {
                log.warn("Ride share email failed: {}", e.getMessage());
            }
        });

        return ResponseEntity.ok(ApiResponse.success(
            "Ride tracking link shared with " + shareEmail, trackingLink));
    }

    // ── 4. Report Driver ──────────────────────────────────────────
    @PostMapping("/report/{bookingId}")
    public ResponseEntity<ApiResponse<String>> reportDriver(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long bookingId,
            @RequestBody Map<String, String> body) {

        User reporter = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String reason = body.getOrDefault("reason", "No reason provided");

        bookingRepository.findById(bookingId).ifPresent(booking -> {
            try {
                emailService.sendAdminAlert(
                    "🚨 Driver Reported — AVIRO",
                    "Reporter: " + reporter.getFullName() + " (" + reporter.getEmail() + ")\n" +
                    "Booking ID: " + bookingId + "\n" +
                    "Driver: " + booking.getRide().getDriver().getFullName() + "\n" +
                    "Reason: " + reason
                );
            } catch (Exception e) {
                log.warn("Report email failed: {}", e.getMessage());
            }
        });

        log.warn("Driver reported — booking: {} by: {}", bookingId, reporter.getEmail());
        return ResponseEntity.ok(ApiResponse.success(
            "Report submitted. Our team will review within 24 hours.", null));
    }
}