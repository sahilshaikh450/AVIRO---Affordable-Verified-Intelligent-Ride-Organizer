package com.aviro.service.impl;

import com.aviro.dto.request.AuthRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.AuthResponse;
import com.aviro.entity.User;
import com.aviro.exception.AviroException;
import com.aviro.repository.UserRepository;
import com.aviro.security.JwtTokenProvider;
import com.aviro.service.AuthService;
import com.aviro.service.EmailService;
import com.aviro.service.OtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final OtpService otpService;
    private final EmailService emailService;

    private static final Pattern COLLEGE_DOMAIN_PATTERN =
            Pattern.compile("^[\\w.+-]+@[\\w-]+(\\.[\\w-]+)*\\.edu\\.in$", Pattern.CASE_INSENSITIVE);

    @Override
    @Transactional
    public ApiResponse<AuthResponse> register(AuthRequest.Register request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AviroException("Email already registered. Please login.");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .gender(request.getGender())
                .role(request.getRole())
                .collegeName(request.getCollegeName())
                .department(request.getDepartment())
                .yearOfStudy(request.getYearOfStudy())
                .locality(request.getLocality())
                .homeLat(request.getHomeLat())
                .homeLng(request.getHomeLng())
                .isVerified(false)
                .aviroCredits(100)
                .build();

        // Auto college-verify if .edu.in email
        if (isCollegeEmail(request.getEmail())) {
            user.setIsCollegeVerified(true);
        }

        userRepository.save(user);

        String otp = otpService.generateAndSaveOtp(request.getEmail());
        try {
            emailService.sendVerificationEmail(request.getEmail(), request.getFullName(), otp);
        } catch (Exception e) {
            log.warn("Failed to send verification email: {}", e.getMessage());
        }

        log.info("New user registered: {}", request.getEmail());
        return ApiResponse.success("Registration successful! Please verify your email.", buildAuthResponse(user));
    }

    // ── STEP 1: verify password → send OTP → NO token yet ──
    @Override
    public ApiResponse<String> login(AuthRequest.Login request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AviroException("User not found"));

        if (!user.getIsActive()) {
            throw new AviroException("Account is deactivated. Contact support.");
        }

        // Send OTP to email
        String otp = otpService.generateAndSaveOtp("login:" + request.getEmail());
        try {
            emailService.sendVerificationEmail(request.getEmail(), user.getFullName(), otp);
        } catch (Exception e) {
            log.warn("Failed to send login OTP: {}", e.getMessage());
        }

        log.info("Login OTP sent: {}", request.getEmail());
        return ApiResponse.success("OTP sent to your email!", request.getEmail());
    }

    // ── STEP 2: verify OTP → issue JWT token ──
    @Override
    public ApiResponse<AuthResponse> verifyLoginOtp(AuthRequest.LoginVerifyOtp request) {
        boolean valid = otpService.verifyOtp("login:" + request.getEmail(), request.getOtp());
        if (!valid) {
            throw new AviroException("Invalid or expired OTP");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AviroException("User not found"));

        log.info("Login OTP verified, issuing token: {}", request.getEmail());
        return ApiResponse.success("Login successful", buildAuthResponse(user));
    }

    @Override
    @Transactional
    public ApiResponse<String> verifyOtp(AuthRequest.VerifyOtp request) {
        boolean valid = otpService.verifyOtp(request.getEmail(), request.getOtp());
        if (!valid) {
            throw new AviroException("Invalid or expired OTP");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AviroException("User not found"));
        user.setIsVerified(true);
        userRepository.save(user);

        return ApiResponse.success("Email verified successfully! Welcome to AVIRO!", null);
    }

    @Override
    public ApiResponse<AuthResponse> refreshToken(AuthRequest.RefreshToken request) {
        if (!jwtTokenProvider.validateToken(request.getRefreshToken())) {
            throw new AviroException("Invalid or expired refresh token");
        }
        String email = jwtTokenProvider.getEmailFromToken(request.getRefreshToken());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AviroException("User not found"));

        return ApiResponse.success(buildAuthResponse(user));
    }

    @Override
    public ApiResponse<String> forgotPassword(AuthRequest.ForgotPassword request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AviroException("No account found with this email"));

        String otp = otpService.generateAndSaveOtp(request.getEmail());
        try {
            emailService.sendPasswordResetEmail(request.getEmail(), user.getFullName(), otp);
        } catch (Exception e) {
            log.warn("Failed to send reset email: {}", e.getMessage());
        }

        return ApiResponse.success("Password reset OTP sent to your email", null);
    }

    @Override
    @Transactional
    public ApiResponse<String> resetPassword(AuthRequest.ResetPassword request) {
        boolean valid = otpService.verifyOtp(request.getEmail(), request.getOtp());
        if (!valid) throw new AviroException("Invalid or expired OTP");

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AviroException("User not found"));
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return ApiResponse.success("Password reset successfully. Please login.", null);
    }

    @Override
    public ApiResponse<String> logout(String email) {
        return ApiResponse.success("Logged out successfully", null);
    }

    @Override
    @Transactional
    public ApiResponse<String> sendCollegeEmailOtp(String userEmail, AuthRequest.SendCollegeEmailOtp request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AviroException("User not found"));

        String collegeEmail = request.getCollegeEmail().trim().toLowerCase();

        if (!isCollegeEmail(collegeEmail)) {
            throw new AviroException("Please use a valid college email ending in .edu.in");
        }

        String otp = otpService.generateAndSaveOtp("college:" + collegeEmail);
        try {
            emailService.sendVerificationEmail(collegeEmail, user.getFullName(), otp);
        } catch (Exception e) {
            log.warn("Failed to send college email OTP: {}", e.getMessage());
            throw new AviroException("Failed to send OTP. Please try again.");
        }

        return ApiResponse.success("OTP sent to " + collegeEmail, null);
    }

    @Override
    @Transactional
    public ApiResponse<String> verifyCollegeEmailOtp(String userEmail, AuthRequest.VerifyCollegeEmailOtp request) {
        String collegeEmail = request.getCollegeEmail().trim().toLowerCase();

        if (!isCollegeEmail(collegeEmail)) {
            throw new AviroException("Invalid college email domain");
        }

        boolean valid = otpService.verifyOtp("college:" + collegeEmail, request.getOtp());
        if (!valid) {
            throw new AviroException("Invalid or expired OTP");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AviroException("User not found"));

        user.setIsCollegeVerified(true);
        userRepository.save(user);

        return ApiResponse.success("College verified successfully! 🎓", null);
    }

    private boolean isCollegeEmail(String email) {
        return email != null && COLLEGE_DOMAIN_PATTERN.matcher(email.trim()).matches();
    }

    private AuthResponse buildAuthResponse(User user) {
        return AuthResponse.builder()
                .accessToken(jwtTokenProvider.generateAccessToken(user.getEmail()))
                .refreshToken(jwtTokenProvider.generateRefreshToken(user.getEmail()))
                .tokenType("Bearer")
                .user(AuthResponse.UserResponse.builder()
                        .id(user.getId())
                        .fullName(user.getFullName())
                        .email(user.getEmail())
                        .gender(user.getGender())
                        .role(user.getRole())
                        .collegeName(user.getCollegeName())
                        .isVerified(user.getIsVerified())
                        .isCollegeVerified(user.getIsCollegeVerified())
                        .rating(user.getRating())
                        .aviroCredits(user.getAviroCredits())
                        .build())
                .build();
    }
}