package com.aviro.controller;

import com.aviro.dto.request.AuthRequest;
import com.aviro.dto.request.ProfileUpdateRequest;
import com.aviro.dto.request.VehicleRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.UserResponse;
import com.aviro.dto.response.VehicleResponse;
import com.aviro.entity.User;
import com.aviro.enums.Role;
import com.aviro.exception.AviroException;
import com.aviro.repository.UserRepository;
import com.aviro.service.AccountDeletionService;
import com.aviro.service.CollegeIdVerificationService;
import com.aviro.service.UserService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final CollegeIdVerificationService verificationService;
    private final AccountDeletionService accountDeletionService;

    private static final String UPLOAD_DIR =
            System.getProperty("user.dir") + "/uploads/college-ids/";
    private static final long MAX_ID_PHOTO_BYTES = 5L * 1024 * 1024;
    private static final Map<String, String> IMAGE_TYPES =
            Map.of(
                    "image/jpeg",
                    ".jpg",
                    "image/jpg",
                    ".jpg",
                    "image/png",
                    ".png",
                    "image/webp",
                    ".webp");

    private static String saveImage(MultipartFile file, String prefix, Long userId)
            throws IOException {
        if (file.isEmpty()) {
            throw new AviroException("No file uploaded");
        }
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String extension = IMAGE_TYPES.get(type);
        if (extension == null) {
            throw new AviroException("Please upload a photo (JPG, PNG or WEBP)");
        }
        if (file.getSize() > MAX_ID_PHOTO_BYTES) {
            throw new AviroException("Photo is too large. Please use one under 5 MB.");
        }
        String actual = sniffImageExtension(file);
        if (actual == null) {
            throw new AviroException(
                    "This file is not a photo. Please upload a JPG, PNG or WEBP image.");
        }
        extension = actual;
        Path uploadPath = Paths.get(UPLOAD_DIR);
        Files.createDirectories(uploadPath);
        String filename = prefix + "_" + userId + "_" + UUID.randomUUID() + extension;
        Files.copy(file.getInputStream(), uploadPath.resolve(filename));
        return filename;
    }

    static String sniffImageExtension(MultipartFile file) throws IOException {
        byte[] head = new byte[12];
        int n;
        try (java.io.InputStream in = file.getInputStream()) {
            n = in.readNBytes(head, 0, head.length);
        }
        return sniffImageExtension(head, n);
    }

    static String sniffImageExtension(byte[] b, int n) {
        if (n >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF)
            return ".jpg";
        if (n >= 8
                && (b[0] & 0xFF) == 0x89
                && b[1] == 'P'
                && b[2] == 'N'
                && b[3] == 'G'
                && b[4] == 0x0D
                && b[5] == 0x0A
                && b[6] == 0x1A
                && b[7] == 0x0A) return ".png";
        if (n >= 12
                && b[0] == 'R'
                && b[1] == 'I'
                && b[2] == 'F'
                && b[3] == 'F'
                && b[8] == 'W'
                && b[9] == 'E'
                && b[10] == 'B'
                && b[11] == 'P') return ".webp";
        return null;
    }

    private static void deleteStoredImage(String url) {
        if (url == null) return;
        String name = url.substring(url.lastIndexOf('/') + 1);
        if (name.isEmpty() || name.contains("..")) return;
        try {
            Files.deleteIfExists(Paths.get(UPLOAD_DIR).resolve(name));
        } catch (IOException e) {
            log.warn("Could not delete old college ID photo {}: {}", name, e.getMessage());
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getProfile(userDetails.getUsername()));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ProfileUpdateRequest request) {
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
            @AuthenticationPrincipal UserDetails userDetails, @PathVariable Long buddyId) {
        return ResponseEntity.ok(userService.addRideBuddy(userDetails.getUsername(), buddyId));
    }

    @DeleteMapping("/ride-buddies/{buddyId}")
    public ResponseEntity<ApiResponse<String>> removeBuddy(
            @AuthenticationPrincipal UserDetails userDetails, @PathVariable Long buddyId) {
        return ResponseEntity.ok(userService.removeRideBuddy(userDetails.getUsername(), buddyId));
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<String>> deleteMyAccount(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AuthRequest.DeleteAccount request) {
        return ResponseEntity.ok(
                accountDeletionService.deleteAccount(
                        userDetails.getUsername(), request.getPassword()));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Object>> getDashboard(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getDashboardStats(userDetails.getUsername()));
    }

    @PostMapping("/upload-college-id")
    public ResponseEntity<ApiResponse<String>> uploadCollegeId(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("file") MultipartFile file) {

        User user =
                userRepository
                        .findByEmail(userDetails.getUsername())
                        .orElseThrow(() -> new RuntimeException("User not found"));

        try {
            String filename = saveImage(file, "college_id", user.getId());
            String previous = user.getCollegeIdPicUrl();

            log.info(
                    "College ID uploaded for user {}: {} ({} bytes)",
                    user.getId(),
                    filename,
                    file.getSize());

            String imageUrl = "/api/users/college-id-image/" + filename;
            user.setCollegeIdPicUrl(imageUrl);
            user.setIsCollegeVerified(false);
            userRepository.save(user);
            deleteStoredImage(previous);

            String absoluteImagePath = UPLOAD_DIR + filename;

            CollegeIdVerificationService.VerificationResult result =
                    verificationService.verifyCollegeId(user.getId(), absoluteImagePath);

            log.info(
                    "Verification result for user {}: approved={}, message={}",
                    user.getId(),
                    result.approved(),
                    result.message());

            return ResponseEntity.ok(ApiResponse.success(result.message(), imageUrl));

        } catch (IOException e) {
            log.error("File upload failed for user {}: {}", user.getId(), e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Upload failed. Please try again."));
        }
    }

    @PostMapping("/vehicle/photo/{kind}")
    public ResponseEntity<ApiResponse<VehicleResponse>> uploadVehiclePhoto(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String kind,
            @RequestParam("file") MultipartFile file)
            throws IOException {
        if (!"plate".equals(kind) && !"licence".equals(kind)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Unknown photo type"));
        }
        User user =
                userRepository
                        .findByEmail(userDetails.getUsername())
                        .orElseThrow(() -> new AviroException("User not found"));
        String filename = saveImage(file, kind, user.getId());
        try {
            UserService.VehiclePhotoResult result =
                    userService.setVehiclePhoto(
                            user.getEmail(), kind, "/api/users/vehicle-photo/" + filename);
            deleteStoredImage(result.previousUrl());
            return ResponseEntity.ok(
                    ApiResponse.success(
                            "Photo uploaded. An admin will review it soon.", result.vehicle()));
        } catch (RuntimeException e) {
            deleteStoredImage(filename);
            throw e;
        }
    }

    @GetMapping({"/college-id-image/{filename}", "/vehicle-photo/{filename}"})
    public ResponseEntity<org.springframework.core.io.Resource> getCollegeIdImage(
            @AuthenticationPrincipal UserDetails userDetails, @PathVariable String filename) {
        try {
            if (filename.contains("..") || filename.contains("/")) {
                return ResponseEntity.badRequest().build();
            }
            User viewer = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
            boolean isAdmin = viewer != null && viewer.getRole() == Role.ADMIN;
            boolean isOwner =
                    viewer != null
                            && filename.matches(
                                    "(college_id|plate|licence)_" + viewer.getId() + "_[^/]+");
            if (!isAdmin && !isOwner) {
                return ResponseEntity.status(403).build();
            }

            Path filePath = Paths.get(UPLOAD_DIR).resolve(filename).normalize();
            org.springframework.core.io.Resource resource =
                    new org.springframework.core.io.UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                log.warn("College ID image not found: {}", filename);
                return ResponseEntity.notFound().build();
            }

            String contentType = "image/jpeg";
            String lower = filename.toLowerCase();
            if (lower.endsWith(".png")) contentType = "image/png";
            if (lower.endsWith(".webp")) contentType = "image/webp";
            if (lower.endsWith(".gif")) contentType = "image/gif";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header("Cache-Control", "max-age=3600")
                    .body(resource);

        } catch (Exception e) {
            log.error("Error serving college ID image {}: {}", filename, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
}
