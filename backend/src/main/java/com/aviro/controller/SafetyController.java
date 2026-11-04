package com.aviro.controller;

import com.aviro.dto.response.ApiResponse;
import com.aviro.entity.Booking;
import com.aviro.entity.RideShareLink;
import com.aviro.entity.SafetyReport;
import com.aviro.entity.User;
import com.aviro.enums.BookingStatus;
import com.aviro.enums.SafetyReportStatus;
import com.aviro.exception.AviroException;
import com.aviro.repository.BookingRepository;
import com.aviro.repository.RideShareLinkRepository;
import com.aviro.repository.SafetyReportRepository;
import com.aviro.repository.UserRepository;
import com.aviro.service.EmailService;
import com.aviro.service.LiveLocationStore;
import com.aviro.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/safety")
@RequiredArgsConstructor
@Slf4j
public class SafetyController {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final RideShareLinkRepository shareLinkRepository;
    private final SafetyReportRepository reportRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    static final int MAX_CONTACTS = 3;
    private static final Pattern EMAIL = Pattern.compile("^[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+$");
    private static final SecureRandom RANDOM = new SecureRandom();

    // Trips the user can share (driver has accepted) and report (it went ahead or was called off)
    private static final Set<BookingStatus> SHAREABLE = EnumSet.of(BookingStatus.CONFIRMED);
    private static final Set<BookingStatus> REPORTABLE =
            EnumSet.of(BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED);
    private static final int REPORT_WITHIN_DAYS = 30;
    // A shared link keeps working until this long after the planned departure
    private static final int LINK_HOURS_AFTER_DEPARTURE = 12;

    public static final List<String> REPORT_REASONS = List.of(
            "Rash or unsafe driving",
            "Rude or inappropriate behaviour",
            "Took a different route",
            "Asked for more money",
            "Different person or vehicle",
            "Unsafe vehicle",
            "Did not show up",
            "Other");

    @Value("${aviro.frontend-url:https://aviro-affordable-verified-intellige.vercel.app}")
    private String frontendUrl;

    // ── 1. Emergency contacts ───────────────────────────────────
    @GetMapping("/emergency-contacts")
    public ResponseEntity<ApiResponse<List<String>>> getEmergencyContacts(@AuthenticationPrincipal UserDetails userDetails) {
        User user = currentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(new ArrayList<>(user.getEmergencyContacts())));
    }

    @PostMapping("/emergency-contacts")
    public ResponseEntity<ApiResponse<List<String>>> saveEmergencyContacts(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {

        User user = currentUser(userDetails);

        // Accepts a JSON array or a comma-separated string
        List<String> given = new ArrayList<>();
        Object contactsObj = body.get("contacts");
        if (contactsObj instanceof List<?> list) {
            for (Object item : list) if (item != null) given.add(item.toString());
        } else if (contactsObj instanceof String str) {
            given.addAll(Arrays.asList(str.split(",")));
        }

        // Lower-case, drop blanks and repeats, keep the order the user typed
        LinkedHashSet<String> contacts = new LinkedHashSet<>();
        for (String c : given) {
            String email = c.trim().toLowerCase(Locale.ROOT);
            if (email.isEmpty()) continue;
            if (!EMAIL.matcher(email).matches()) throw new AviroException("Not a valid email: " + email);
            if (email.equalsIgnoreCase(user.getEmail())) {
                throw new AviroException("Add someone else's email, not your own");
            }
            contacts.add(email);
        }
        if (contacts.size() > MAX_CONTACTS) {
            throw new AviroException("You can save up to " + MAX_CONTACTS + " emergency contacts");
        }

        user.getEmergencyContacts().clear();
        user.getEmergencyContacts().addAll(contacts);
        userRepository.save(user);

        log.info("Emergency contacts updated for user {}: {} saved", user.getId(), contacts.size());
        String message = contacts.isEmpty() ? "Emergency contacts removed"
                : "Emergency contacts saved (" + contacts.size() + ")";
        return ResponseEntity.ok(ApiResponse.success(message, new ArrayList<>(contacts)));
    }

    // ── 2. Trips for the share and report pickers ────────────────
    @GetMapping("/trips")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> myTrips(@AuthenticationPrincipal UserDetails userDetails) {
        User user = currentUser(userDetails);
        LocalDateTime since = LocalDateTime.now().minusDays(REPORT_WITHIN_DAYS);
        Set<BookingStatus> statuses = EnumSet.copyOf(REPORTABLE);
        statuses.addAll(SHAREABLE);

        List<Map<String, Object>> trips = new ArrayList<>();
        for (Booking b : bookingRepository.findTripsForUser(user.getId(), since, statuses)) {
            boolean asDriver = b.getRide().getDriver().getId().equals(user.getId());
            User other = asDriver ? b.getRider() : b.getRide().getDriver();
            Map<String, Object> trip = new LinkedHashMap<>();
            trip.put("bookingId", b.getId());
            trip.put("role", asDriver ? "DRIVER" : "RIDER");
            trip.put("otherName", firstName(other));
            trip.put("fromLocation", b.getRide().getFromLocation());
            trip.put("toLocation", b.getRide().getToLocation());
            trip.put("departureTime", b.getRide().getDepartureTime());
            trip.put("status", b.getStatus());
            trip.put("tripStage", b.getTripStage());
            trip.put("canShare", canShare(b));
            trips.add(trip);
            if (trips.size() >= 30) break;
        }
        return ResponseEntity.ok(ApiResponse.success(trips));
    }

    // ── 3. SOS alert ─────────────────────────────────────────────
    @PostMapping("/sos")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendSOS(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {

        User user = currentUser(userDetails);

        Long bookingId = parseLong(body.get("bookingId"));
        Booking booking = null;
        if (bookingId != null) {
            requireParticipant(user, bookingId);
            booking = bookingRepository.findById(bookingId).orElse(null);
        }
        Double lat = parseDouble(body.get("lat"));
        Double lng = parseDouble(body.get("lng"));
        boolean hasLocation = LiveLocationStore.valid(lat, lng);
        String mapsLink = hasLocation ? "https://maps.google.com/?q=" + lat + "," + lng : null;

        // During a trip the contacts also get the live trip link
        String tripLink = booking != null && canShare(booking) ? frontendUrl + "/share/" + shareLinkFor(booking, user).getToken() : null;

        StringBuilder sos = new StringBuilder()
                .append(user.getFullName()).append(" pressed the SOS button on AVIRO.\n")
                .append("Phone: ").append(user.getPhone() != null && !user.getPhone().isBlank() ? user.getPhone() : "not added").append('\n')
                .append("Location: ").append(mapsLink != null ? mapsLink : "not available").append('\n');
        if (booking != null) {
            sos.append("Trip: ").append(booking.getRide().getFromLocation()).append(" → ").append(booking.getRide().getToLocation()).append('\n');
        }
        sos.append("\nPlease call them now. If you can't reach them, call 112.");

        // Tell the other person on the trip
        boolean otherNotified = false;
        if (booking != null) {
            Long driverId = booking.getRide().getDriver().getId();
            Long targetId = user.getId().equals(driverId) ? booking.getRider().getId() : driverId;
            try {
                notificationService.send(targetId, "🆘 SOS from " + firstName(user),
                        firstName(user) + " pressed SOS" + (mapsLink != null ? ". Location: " + mapsLink : "."),
                        "SOS_ALERT", bookingId.toString());
                otherNotified = true;
            } catch (Exception e) {
                log.warn("SOS notification failed: {}", e.getMessage());
            }
        }

        int emailed = 0;
        for (String email : user.getEmergencyContacts()) {
            emailService.sendSosAlert(email, user.getFullName(), sos.toString(), mapsLink, tripLink);
            emailed++;
        }

        log.warn("SOS by user {} (booking {}), contacts emailed: {}", user.getId(), bookingId, emailed);

        String message;
        if (emailed > 0) {
            message = "SOS sent to " + emailed + " emergency contact" + (emailed > 1 ? "s" : "")
                    + (otherNotified ? " and your " + (user.getId().equals(booking.getRide().getDriver().getId()) ? "rider" : "driver") : "")
                    + ". If you are in danger, call 112.";
        } else if (otherNotified) {
            message = "SOS sent to your " + (user.getId().equals(booking.getRide().getDriver().getId()) ? "rider" : "driver")
                    + ". You have no emergency contacts saved. If you are in danger, call 112.";
        } else {
            message = "No one could be alerted: you have no emergency contacts saved. Call 112 now if you are in danger.";
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("contactsEmailed", emailed);
        result.put("otherPersonNotified", otherNotified);
        result.put("tripLink", tripLink);
        return ResponseEntity.ok(ApiResponse.success(message, result));
    }

    // ── 4. Share a trip with family ──────────────────────────────
    // Returns a link anyone can open without an account; emails it too when an address is given
    @PostMapping("/share-ride/{bookingId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> shareRide(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long bookingId,
            @RequestBody(required = false) Map<String, String> body) {

        User user = currentUser(userDetails);
        requireParticipant(user, bookingId);
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AviroException("Booking not found"));
        if (!canShare(booking)) {
            throw new AviroException(booking.getStatus() == BookingStatus.REQUESTED
                    ? "You can share the trip once the driver accepts"
                    : "This trip is over, so it can't be shared");
        }

        String shareEmail = body == null ? null : body.get("email");
        if (shareEmail != null && !shareEmail.isBlank()) {
            shareEmail = shareEmail.trim().toLowerCase(Locale.ROOT);
            if (!EMAIL.matcher(shareEmail).matches()) throw new AviroException("Not a valid email address");
        } else {
            shareEmail = null;
        }

        RideShareLink link = shareLinkFor(booking, user);
        String url = frontendUrl + "/share/" + link.getToken();

        if (shareEmail != null) {
            String message = user.getFullName() + " is taking an AVIRO ride from "
                    + booking.getRide().getFromLocation() + " to " + booking.getRide().getToLocation()
                    + ".\nYou can follow the trip on a map until it ends. No account is needed.";
            emailService.sendRideShareAlert(shareEmail, user.getFullName(), message, url);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("link", url);
        result.put("expiresAt", link.getExpiresAt());
        return ResponseEntity.ok(ApiResponse.success(
                shareEmail != null ? "Trip link sent to " + shareEmail : "Trip link ready", result));
    }

    // ── 5. Report the other person on a trip ─────────────────────
    @GetMapping("/report-reasons")
    public ResponseEntity<ApiResponse<List<String>>> reportReasons() {
        return ResponseEntity.ok(ApiResponse.success(REPORT_REASONS));
    }

    @PostMapping("/report/{bookingId}")
    public ResponseEntity<ApiResponse<String>> report(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long bookingId,
            @RequestBody Map<String, String> body) {

        User reporter = currentUser(userDetails);
        requireParticipant(reporter, bookingId);
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AviroException("Booking not found"));

        if (!REPORTABLE.contains(booking.getStatus())) {
            throw new AviroException("You can report a trip once the driver has accepted it");
        }
        if (booking.getRide().getDepartureTime().isBefore(LocalDateTime.now().minusDays(REPORT_WITHIN_DAYS))) {
            throw new AviroException("Trips older than " + REPORT_WITHIN_DAYS + " days can't be reported here. Email aviro.support@gmail.com");
        }

        String reason = body.get("reason") == null ? "" : body.get("reason").trim();
        if (!REPORT_REASONS.contains(reason)) throw new AviroException("Choose a reason");
        String details = body.get("details") == null ? "" : body.get("details").trim();
        if (details.length() > 1000) details = details.substring(0, 1000);
        if ("Other".equals(reason) && details.length() < 10) {
            throw new AviroException("Tell us what happened (at least 10 characters)");
        }
        if (reportRepository.existsByBookingIdAndReporterIdAndStatus(bookingId, reporter.getId(), SafetyReportStatus.OPEN)) {
            throw new AviroException("You already reported this trip. Our team is looking into it.");
        }

        boolean reporterIsDriver = booking.getRide().getDriver().getId().equals(reporter.getId());
        User reported = reporterIsDriver ? booking.getRider() : booking.getRide().getDriver();

        SafetyReport saved = reportRepository.save(SafetyReport.builder()
                .booking(booking)
                .reporter(reporter)
                .reportedUser(reported)
                .reason(reason)
                .details(details.isEmpty() ? null : details)
                .build());

        emailService.sendAdminAlert("🚨 Safety report #" + saved.getId() + " — AVIRO",
                "Reporter: " + reporter.getFullName() + " (" + reporter.getEmail() + ")\n"
                        + "Reported " + (reporterIsDriver ? "rider" : "driver") + ": " + reported.getFullName() + " (" + reported.getEmail() + ")\n"
                        + "Booking: #" + bookingId + " · " + booking.getRide().getFromLocation() + " → " + booking.getRide().getToLocation() + "\n"
                        + "Reason: " + reason + (details.isEmpty() ? "" : "\nDetails: " + details));

        log.warn("Safety report {} on booking {} by user {}", saved.getId(), bookingId, reporter.getId());
        return ResponseEntity.ok(ApiResponse.success(
                "Report submitted. Our team will look into it within 24 hours.", null));
    }

    // ── Helpers ─────────────────────────────────────────────────

    private User currentUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new AviroException("User not found"));
    }

    // Accepted, and not long past its departure
    private boolean canShare(Booking b) {
        return SHAREABLE.contains(b.getStatus())
                && b.getRide().getDepartureTime().plusHours(LINK_HOURS_AFTER_DEPARTURE).isAfter(LocalDateTime.now());
    }

    // One link per person per trip; sharing again reuses it
    private RideShareLink shareLinkFor(Booking booking, User sharer) {
        LocalDateTime now = LocalDateTime.now();
        return shareLinkRepository.findFirstByBookingIdAndSharerIdAndExpiresAtAfter(booking.getId(), sharer.getId(), now)
                .orElseGet(() -> {
                    byte[] bytes = new byte[24];
                    RANDOM.nextBytes(bytes);
                    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
                    return shareLinkRepository.save(RideShareLink.builder()
                            .token(token)
                            .booking(booking)
                            .sharer(sharer)
                            .expiresAt(booking.getRide().getDepartureTime().plusHours(LINK_HOURS_AFTER_DEPARTURE))
                            .build());
                });
    }

    // Only the rider or driver of a booking can share, report or raise SOS on it
    private void requireParticipant(User user, Long bookingId) {
        Long riderId = bookingRepository.findRiderIdByBookingId(bookingId)
                .orElseThrow(() -> new AviroException("Booking not found"));
        Long driverId = bookingRepository.findDriverIdByBookingId(bookingId).orElse(null);
        if (!user.getId().equals(riderId) && !user.getId().equals(driverId)) {
            throw new AccessDeniedException("You are not part of this booking");
        }
    }

    static String firstName(User u) {
        String name = u.getFullName() == null ? "" : u.getFullName().trim();
        int space = name.indexOf(' ');
        return space > 0 ? name.substring(0, space) : name;
    }

    private static Long parseLong(Object v) {
        if (v == null || v.toString().isBlank()) return null;
        try { return Long.valueOf(v.toString().trim()); } catch (NumberFormatException e) { throw new AviroException("Invalid booking"); }
    }

    private static Double parseDouble(Object v) {
        if (v == null || v.toString().isBlank()) return null;
        try { return Double.valueOf(v.toString().trim()); } catch (NumberFormatException e) { return null; }
    }
}
