package com.aviro.controller;

import com.aviro.dto.response.ApiResponse;
import com.aviro.entity.Booking;
import com.aviro.entity.RideShareLink;
import com.aviro.entity.User;
import com.aviro.entity.Vehicle;
import com.aviro.enums.BookingStatus;
import com.aviro.exception.AviroException;
import com.aviro.repository.RideShareLinkRepository;
import com.aviro.repository.VehicleRepository;
import com.aviro.service.LiveLocationStore;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/public/share")
@RequiredArgsConstructor
public class PublicShareController {

    private final RideShareLinkRepository shareLinkRepository;
    private final LiveLocationStore liveLocations;
    private final VehicleRepository vehicleRepository;

    @GetMapping("/{token}")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> sharedTrip(@PathVariable String token) {
        if (token == null || token.length() > 64)
            throw new AviroException("This link is not valid");
        RideShareLink link =
                shareLinkRepository
                        .findByToken(token)
                        .orElseThrow(() -> new AviroException("This link is not valid"));

        Booking booking = link.getBooking();
        User driver = booking.getRide().getDriver();
        boolean sharerIsDriver = link.getSharer().getId().equals(driver.getId());
        boolean live =
                booking.getStatus() == BookingStatus.CONFIRMED
                        && link.getExpiresAt().isAfter(LocalDateTime.now());

        Map<String, Object> trip = new LinkedHashMap<>();
        trip.put("sharerName", SafetyController.firstName(link.getSharer()));
        trip.put("sharerIsDriver", sharerIsDriver);
        trip.put("driverName", SafetyController.firstName(driver));
        trip.put("riderName", SafetyController.firstName(booking.getRider()));
        trip.put("fromLocation", booking.getRide().getFromLocation());
        trip.put("toLocation", booking.getRide().getToLocation());
        trip.put("departureTime", booking.getRide().getDepartureTime());
        trip.put("status", booking.getStatus());
        trip.put("tripStage", booking.getTripStage());
        trip.put("live", live);

        Vehicle v = vehicleRepository.findByUserId(driver.getId()).orElse(null);
        if (v != null) {
            Map<String, Object> vehicle = new LinkedHashMap<>();
            vehicle.put("type", v.getVehicleType());
            vehicle.put(
                    "name",
                    ((v.getMake() == null ? "" : v.getMake())
                                    + " "
                                    + (v.getModel() == null ? "" : v.getModel()))
                            .trim());
            vehicle.put("color", v.getColor());
            vehicle.put("plate", v.getRegistrationNumber());
            trip.put("vehicle", vehicle);
        }

        if (live) {
            LiveLocationStore.Position own =
                    sharerIsDriver
                            ? liveLocations.driver(booking.getId())
                            : liveLocations.rider(booking.getId());
            LiveLocationStore.Position fallback =
                    sharerIsDriver ? null : liveLocations.driver(booking.getId());
            LiveLocationStore.Position at = own != null ? own : fallback;
            if (at != null) {
                trip.put(
                        "location", Map.of("lat", at.lat(), "lng", at.lng(), "updatedAt", at.at()));
            }
        }

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.success(trip));
    }
}
