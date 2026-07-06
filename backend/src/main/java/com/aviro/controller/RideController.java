package com.aviro.controller;

import com.aviro.dto.request.RideRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.RideResponse;
import com.aviro.service.RideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;

    @PostMapping
    public ResponseEntity<ApiResponse<RideResponse>> createRide(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RideRequest.Create request) {
        return ResponseEntity.ok(rideService.createRide(userDetails.getUsername(), request));
    }

    @PostMapping("/search")
    public ResponseEntity<ApiResponse<List<RideResponse>>> searchRides(
            @RequestBody RideRequest.Search request) {
        return ResponseEntity.ok(rideService.searchRides(request));
    }

    @GetMapping("/{rideId}")
    public ResponseEntity<ApiResponse<RideResponse>> getRide(@PathVariable Long rideId) {
        return ResponseEntity.ok(rideService.getRideById(rideId));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<RideResponse>>> getMyRides(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rideService.getMyRides(userDetails.getUsername()));
    }

    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<List<RideResponse>>> getNearbyRides(
            @RequestParam Double lat,
            @RequestParam Double lng,
            @RequestParam(defaultValue = "1") Integer seats) {
        return ResponseEntity.ok(rideService.getNearbyRides(lat, lng, seats));
    }

    @PatchMapping("/{rideId}/status")
    public ResponseEntity<ApiResponse<RideResponse>> updateStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long rideId,
            @RequestBody RideRequest.UpdateStatus request) {
        return ResponseEntity.ok(rideService.updateRideStatus(userDetails.getUsername(), rideId, request.getStatus()));
    }

    @DeleteMapping("/{rideId}")
    public ResponseEntity<ApiResponse<String>> cancelRide(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long rideId) {
        return ResponseEntity.ok(rideService.cancelRide(userDetails.getUsername(), rideId));
    }

    @GetMapping("/fare-estimate")
    public ResponseEntity<ApiResponse<Double>> estimateFare(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(defaultValue = "1") Integer seats) {
        return ResponseEntity.ok(rideService.estimateFare(from, to, seats));
    }
}
