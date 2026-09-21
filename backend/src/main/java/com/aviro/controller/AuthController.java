package com.aviro.controller;

import com.aviro.dto.request.AuthRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.AuthResponse;
import com.aviro.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody AuthRequest.Register request) {

        return ResponseEntity.ok(authService.register(request));
    }

    // Temporary: password login → JWT directly
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody AuthRequest.Login request) {

        return ResponseEntity.ok(authService.login(request));
    }

    // Keep this endpoint for OTP feature restoration later
    @PostMapping("/login-verify-otp")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyLoginOtp(
            @Valid @RequestBody AuthRequest.LoginVerifyOtp request) {

        return ResponseEntity.ok(authService.verifyLoginOtp(request));
    }

    // Registration email verification OTP
    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<String>> verifyOtp(
            @Valid @RequestBody AuthRequest.VerifyOtp request) {

        return ResponseEntity.ok(authService.verifyOtp(request));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody AuthRequest.RefreshToken request) {

        return ResponseEntity.ok(authService.refreshToken(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(
            @Valid @RequestBody AuthRequest.ForgotPassword request) {

        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(
            @Valid @RequestBody AuthRequest.ResetPassword request) {

        return ResponseEntity.ok(authService.resetPassword(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(authService.logout(userDetails.getUsername()));
    }

    // College email verification endpoints
    @PostMapping("/send-college-email-otp")
    public ResponseEntity<ApiResponse<String>> sendCollegeEmailOtp(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AuthRequest.SendCollegeEmailOtp request) {

        return ResponseEntity.ok(
                authService.sendCollegeEmailOtp(
                        userDetails.getUsername(),
                        request
                )
        );
    }

    @PostMapping("/verify-college-email-otp")
    public ResponseEntity<ApiResponse<String>> verifyCollegeEmailOtp(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AuthRequest.VerifyCollegeEmailOtp request) {

        return ResponseEntity.ok(
                authService.verifyCollegeEmailOtp(
                        userDetails.getUsername(),
                        request
                )
        );
    }
}
