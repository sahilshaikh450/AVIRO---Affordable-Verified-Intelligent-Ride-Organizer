package com.aviro.controller;

import com.aviro.dto.request.ReviewRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.entity.Review;
import com.aviro.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ApiResponse<String>> submitReview(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(reviewService.submitReview(userDetails.getUsername(), request));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUserReviews(@PathVariable Long userId) {
        ApiResponse<List<Review>> raw = reviewService.getUserReviews(userId);

        // Convert entities to plain maps to avoid Hibernate proxy serialization issues
        List<Map<String, Object>> safe = raw.getData().stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("rating", r.getRating());
            m.put("comment", r.getComment());
            m.put("createdAt", r.getCreatedAt());

            Map<String, Object> reviewer = new LinkedHashMap<>();
            if (r.getReviewer() != null) {
                reviewer.put("id", r.getReviewer().getId());
                reviewer.put("fullName", r.getReviewer().getFullName());
                reviewer.put("gender", r.getReviewer().getGender());
                reviewer.put("profilePicUrl", r.getReviewer().getProfilePicUrl());
            }
            m.put("reviewer", reviewer);

            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(safe));
    }
}