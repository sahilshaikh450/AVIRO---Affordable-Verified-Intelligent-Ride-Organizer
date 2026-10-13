package com.aviro.service.impl;

import com.aviro.dto.request.AuthRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.AuthResponse;
import com.aviro.dto.response.UserResponse;
import com.aviro.entity.User;
import com.aviro.enums.Gender;
import com.aviro.enums.Role;
import com.aviro.exception.AviroException;
import com.aviro.repository.UserRepository;
import com.aviro.security.JwtTokenProvider;
import com.aviro.service.AuthService;
import com.aviro.service.EmailService;
import com.aviro.service.OtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository   userRepository;
    private final PasswordEncoder  passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final OtpService       otpService;
    private final EmailService     emailService;

    // ══════════════════════════════════════════════════
    // REGISTER
    // ══════════════════════════════════════════════════
    @Override
    @Transactional
    public ApiResponse<String> register(AuthRequest.Register request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AviroException("Email already registered. Please login.");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .gender(request.getGender() != null ? request.getGender() : Gender.MALE)
                .role(Role.RIDER)
                .collegeName(request.getCollegeName())
                .department(request.getDepartment())
                .yearOfStudy(request.getYearOfStudy())
                .locality(request.getLocality() != null ? request.getLocality() : "Pune")
                .phone(request.getPhone())
                // ✅ Auto verify — no OTP needed
                .isVerified(true)
                .isCollegeVerified(false)
                .isActive(true)
                .build();

        userRepository.save(user);
        log.info("✅ User registered: {}", request.getEmail());

        // Try to send welcome email — but don't fail if it doesn't work
        try {
            emailService.sendWelcomeEmail(user.getEmail(), user.getFullName());
        } catch (Exception e) {
            log.warn("Welcome email failed for {}: {}", user.getEmail(), e.getMessage());
        }

        return ApiResponse.success(
            "Registration successful! You can now login.", null);
    }

    // ══════════════════════════════════════════════════
    // VERIFY OTP (Email verification — now auto-verified)
    // ══════════════════════════════════════════════════
    @Override
    public ApiResponse<String> verifyOtp(String email, String otp) {
        // Since we auto-verify, just return success
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AviroException("User not found"));
        user.setIsVerified(true);
        userRepository.save(user);
        return ApiResponse.success("Email verified successfully!", null);
    }

    // ══════════════════════════════════════════════════
    // LOGIN — Step 1: Verify password → Send OTP
    // ══════════════════════════════════════════════════
    @Override
    public ApiResponse<String> login(AuthRequest.Login request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AviroException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AviroException("Invalid email or password");
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new AviroException("Account is deactivated. Contact support.");
        }

        // Generate OTP
        String otp = otpService.generateOtp("login:" + request.getEmail());
        log.info("Login OTP for {}: {}", request.getEmail(), otp);

        // Try email — if fails, log OTP for manual use
        try {
            emailService.sendLoginOtp(request.getEmail(), otp);
            log.info("Login OTP sent to: {}", request.getEmail());
        } catch (Exception e) {
            log.warn("⚠️ OTP email failed for {} — OTP is: {} — Error: {}",
                request.getEmail(), otp, e.getMessage());
        }

        return ApiResponse.success(
            "OTP sent to your email! Check inbox and spam folder.", null);
    }

    // ══════════════════════════════════════════════════
    // LOGIN — Step 2: Verify OTP → Return JWT
    // ══════════════════════════════════════════════════
    @Override
    public ApiResponse<AuthResponse> loginVerifyOtp(String email, String otp) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AviroException("User not found"));

        // ✅ Verify OTP from Redis
        if (!otpService.verifyOtp("login:" + email, otp)) {
            throw new AviroException("Invalid or expired OTP. Please try again.");
        }

        // Generate JWT tokens
        String accessToken  = jwtTokenProvider.generateToken(user.getEmail());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());

        log.info("✅ Login successful: {}", email);

        UserResponse userResponse = toUserResponse(user);

        return ApiResponse.success("Login successful!", AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(userResponse)
                .build());
    }

    // ══════════════════════════════════════════════════
    // FORGOT PASSWORD
    // ══════════════════════════════════════════════════
    @Override
    public ApiResponse<String> forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AviroException("No account found with this email"));

        String otp = otpService.generateOtp("reset:" + email);
        log.info("Password reset OTP for {}: {}", email, otp);

        try {
            emailService.sendPasswordResetOtp(email, otp);
        } catch (Exception e) {
            log.warn("Reset OTP email failed for {}: {}", email, e.getMessage());
        }

        return ApiResponse.success("Password reset OTP sent to your email!", null);
    }

    // ══════════════════════════════════════════════════
    // RESET PASSWORD
    // ══════════════════════════════════════════════════
    @Override
    @Transactional
    public ApiResponse<String> resetPassword(String email, String otp, String newPassword) {
        if (!otpService.verifyOtp("reset:" + email, otp)) {
            throw new AviroException("Invalid or expired OTP");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AviroException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        log.info("Password reset successful: {}", email);
        return ApiResponse.success("Password reset successfully! You can now login.", null);
    }

    // ══════════════════════════════════════════════════
    // Helper
    // ══════════════════════════════════════════════════
    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .gender(user.getGender())
                .role(user.getRole())
                .collegeName(user.getCollegeName())
                .department(user.getDepartment())
                .yearOfStudy(user.getYearOfStudy())
                .locality(user.getLocality())
                .profilePicUrl(user.getProfilePicUrl())
                .collegeIdPicUrl(user.getCollegeIdPicUrl())
                .isVerified(user.getIsVerified())
                .isCollegeVerified(user.getIsCollegeVerified())
                .rating(user.getRating())
                .totalRides(user.getTotalRides())
                .aviroCredits(user.getAviroCredits())
                .co2Saved(user.getCo2Saved())
                .build();
    }
}
