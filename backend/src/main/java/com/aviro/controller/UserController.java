package com.aviro.controller;

import com.aviro.dto.request.ProfileUpdateRequest;
import com.aviro.dto.request.VehicleRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.UserResponse;
import com.aviro.dto.response.VehicleResponse;
import com.aviro.entity.User;
import com.aviro.repository.UserRepository;
import com.aviro.service.CollegeIdVerificationService;
import com.aviro.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final CollegeIdVerificationService verificationService;

    private static final String UPLOAD_DIR = "uploads/college-ids/";

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getProfile(userDetails.getUsername()));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(userService.updateProfile(userDetails.getUsername(), request));
    }

    @PostMapping("/vehicle")
    public ResponseEntity<ApiResponse<VehicleResponse>> addVehicle(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody VehicleRequest request) {
        return ResponseEntity.ok(userService.addVehicle(userDetails.getUsername(), request));
    }

    @GetMapping("/vehicle")
    public ResponseEntity<ApiResponse<VehicleResponse>> getVehicle(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getVehicle(userDetails.getUsername()));
    }

    @PostMapping("/ride-buddies/{buddyId}")
    public ResponseEntity<ApiResponse<String>> addBuddy(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long buddyId) {
        return ResponseEntity.ok(userService.addRideBuddy(userDetails.getUsername(), buddyId));
    }

    @DeleteMapping("/ride-buddies/{buddyId}")
    public ResponseEntity<ApiResponse<String>> removeBuddy(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long buddyId) {
        return ResponseEntity.ok(userService.removeRideBuddy(userDetails.getUsername(), buddyId));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Object>> getDashboard(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getDashboardStats(userDetails.getUsername()));
    }

    // ── UPLOAD + AUTO-VERIFY COLLEGE ID ──────────────────────────
    @PostMapping("/upload-college-id")
    public ResponseEntity<ApiResponse<String>> uploadCollegeId(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("file") MultipartFile file) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("No file uploaded"));
        }

        try {
            // Save file
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);

            String originalName = file.getOriginalFilename();
            String extension = (originalName != null && originalName.contains("."))
                    ? originalName.substring(originalName.lastIndexOf(".")) : ".jpg";
            String filename = "college_id_" + user.getId() + "_" + UUID.randomUUID() + extension;

            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath);

            String imageUrl = "/api/users/college-id-image/" + filename;
            user.setCollegeIdPicUrl(imageUrl);
            user.setIsCollegeVerified(false); // Reset until AI verifies
            userRepository.save(user);

            // 🤖 AUTO-VERIFY using Claude Vision AI
            CollegeIdVerificationService.VerificationResult result =
                    verificationService.verifyCollegeId(user.getId(), UPLOAD_DIR + filename);

            if (result.approved()) {
                return ResponseEntity.ok(ApiResponse.success(
                        "✅ College ID verified automatically! You can now book and post rides.",
                        imageUrl
                ));
            } else {
                return ResponseEntity.ok(ApiResponse.success(
                        "📤 ID uploaded. " + result.message(),
                        imageUrl
                ));
            }

        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Upload failed: " + e.getMessage()));
        }
    }

    // ── SERVE IMAGE ──────────────────────────────────────────────
    @GetMapping("/college-id-image/{filename}")
    public ResponseEntity<org.springframework.core.io.Resource> getCollegeIdImage(
            @PathVariable String filename) {
        try {
            Path filePath = Paths.get(UPLOAD_DIR).resolve(filename);
            org.springframework.core.io.Resource resource =
                    new org.springframework.core.io.UrlResource(filePath.toUri());

            if (!resource.exists()) return ResponseEntity.notFound().build();

            return ResponseEntity.ok()
                    .header("Content-Type", "image/jpeg")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}