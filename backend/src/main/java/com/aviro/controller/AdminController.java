package com.aviro.controller;

import com.aviro.dto.response.ApiResponse;
import com.aviro.entity.User;
import com.aviro.entity.Vehicle;
import com.aviro.repository.UserRepository;
import com.aviro.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;

    // ── Pending College ID verifications ──────────────────────────
    @GetMapping("/pending-verifications")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPendingVerifications() {
        List<User> users = userRepository.findPendingCollegeVerifications();

        List<Map<String, Object>> safe = users.stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("fullName", u.getFullName());
            m.put("email", u.getEmail());
            m.put("collegeName", u.getCollegeName());
            m.put("collegeIdNumber", u.getCollegeIdNumber());
            m.put("collegeIdPicUrl", u.getCollegeIdPicUrl());
            m.put("gender", u.getGender());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(safe));
    }

    // ── Approve college ID ────────────────────────────────────────
    @PostMapping("/verify-college-id/{userId}")
    public ResponseEntity<ApiResponse<String>> approveVerification(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsCollegeVerified(true);
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("User college ID verified!", null));
    }

    // ── Reject college ID ─────────────────────────────────────────
    @PostMapping("/reject-college-id/{userId}")
    public ResponseEntity<ApiResponse<String>> rejectVerification(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsCollegeVerified(false);
        user.setCollegeIdPicUrl(null);
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("Verification rejected.", null));
    }

    // ── Pending Vehicle verifications ─────────────────────────────
    @GetMapping("/pending-vehicles")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPendingVehicles() {
        List<Vehicle> vehicles = vehicleRepository.findPendingWithOwner();

        List<Map<String, Object>> safe = vehicles.stream().map(v -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("vehicleId", v.getId());
            m.put("vehicleType", v.getVehicleType());
            m.put("registrationNumber", v.getRegistrationNumber());
            m.put("make", v.getMake());
            m.put("model", v.getModel());
            m.put("color", v.getColor());
            m.put("totalSeats", v.getTotalSeats());
            // Owner info
            if (v.getUser() != null) {
                m.put("ownerName", v.getUser().getFullName());
                m.put("ownerEmail", v.getUser().getEmail());
                m.put("collegeName", v.getUser().getCollegeName());
            }
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(safe));
    }

    // ── Approve vehicle ───────────────────────────────────────────
    @PostMapping("/verify-vehicle/{vehicleId}")
    public ResponseEntity<ApiResponse<String>> approveVehicle(@PathVariable Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        vehicle.setIsVerified(true);
        vehicleRepository.save(vehicle);
        return ResponseEntity.ok(ApiResponse.success("Vehicle verified successfully!", null));
    }

    // ── Reject vehicle ────────────────────────────────────────────
    @PostMapping("/reject-vehicle/{vehicleId}")
    public ResponseEntity<ApiResponse<String>> rejectVehicle(@PathVariable Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        vehicle.setIsVerified(false);
        vehicleRepository.save(vehicle);
        return ResponseEntity.ok(ApiResponse.success("Vehicle rejected.", null));
    }

    // ── Stats ─────────────────────────────────────────────────────
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        // Counts in the database instead of loading every user and vehicle
        long totalUsers       = userRepository.count();
        long verifiedUsers    = userRepository.countByIsCollegeVerifiedTrue();
        long pendingUsers     = userRepository.findPendingCollegeVerifications().size();
        long totalVehicles    = vehicleRepository.count();
        long verifiedVehicles = vehicleRepository.countByIsVerifiedTrue();
        long pendingVehicles  = totalVehicles - verifiedVehicles;

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("verifiedUsers", verifiedUsers);
        stats.put("pendingUsers", pendingUsers);
        stats.put("totalVehicles", totalVehicles);
        stats.put("verifiedVehicles", verifiedVehicles);
        stats.put("pendingVehicles", pendingVehicles);

        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}