package com.aviro.controller;

import com.aviro.dto.response.ApiResponse;
import com.aviro.exception.AviroException;
import com.aviro.service.RideRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

// Ride alerts: "tell me when someone offers this ride"
@RestController
@RequestMapping("/ride-requests")
@RequiredArgsConstructor
public class RideRequestController {

    private final RideRequestService rideRequestService;

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {
        LocalDateTime time;
        try {
            time = body.get("departureTime") == null ? null : LocalDateTime.parse(body.get("departureTime").toString());
        } catch (DateTimeParseException e) {
            throw new AviroException("Pick a valid date and time");
        }
        Integer seats = body.get("seatsNeeded") instanceof Number n ? n.intValue() : null;
        return ResponseEntity.ok(ApiResponse.success("We'll notify you when a matching ride is posted 🔔",
                rideRequestService.create(userDetails.getUsername(), str(body.get("fromLocation")),
                        str(body.get("toLocation")), time, seats)));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> mine(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(rideRequestService.mine(userDetails.getUsername())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> cancel(@AuthenticationPrincipal UserDetails userDetails, @PathVariable Long id) {
        rideRequestService.cancel(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Ride alert removed", null));
    }

    @GetMapping("/open")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> open(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(rideRequestService.openForDrivers(userDetails.getUsername())));
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }
}
