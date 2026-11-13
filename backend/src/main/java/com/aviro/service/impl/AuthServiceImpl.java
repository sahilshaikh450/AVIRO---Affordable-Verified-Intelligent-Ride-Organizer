package com.aviro.service.impl;

import com.aviro.dto.request.AuthRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.AuthResponse;
import com.aviro.entity.User;
import com.aviro.enums.Role;
import com.aviro.exception.AviroException;
import com.aviro.repository.UserRepository;
import com.aviro.security.AttemptCounter;
import com.aviro.security.JwtTokenProvider;
import com.aviro.security.TokenBlacklistService;
import com.aviro.service.AuthService;
import com.aviro.service.EmailService;
import com.aviro.service.OtpService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final TokenBlacklistService tokenBlacklistService;

    private final OtpService otpService;
    private final EmailService emailService;
    private final AttemptCounter attempts;

    private static final int MAX_FAILED_LOGINS = 10;
    private static final Duration LOGIN_LOCK_WINDOW = Duration.ofMinutes(15);
    private static final Duration CODE_COOLDOWN = Duration.ofMinutes(1);
    private static final int MAX_CODES_PER_HOUR = 5;

    private static final String VERIFY_OTP_PREFIX = "verify:";
    private static final String RESET_OTP_PREFIX = "reset:";
    private static final String COLLEGE_OTP_PREFIX = "college:";

    private static final Pattern COLLEGE_DOMAIN_PATTERN =
            Pattern.compile(
                    "^[\\w.+-]+@[\\w-]+(\\.[\\w-]+)*\\.(edu\\.in|ac\\.in|edu)$",
                    Pattern.CASE_INSENSITIVE);

    @Override
    @Transactional
    public ApiResponse<AuthResponse> register(AuthRequest.Register request) {

        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new AviroException("Email already registered. Please login.");
        }

        if (request.getRole() == Role.ADMIN) {
            throw new AviroException("Please choose Rider, Driver or Both.");
        }

        User user =
                User.builder()
                        .fullName(request.getFullName())
                        .email(email)
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
                        .guidelinesAcceptedAt(java.time.LocalDateTime.now())
                        .guidelinesVersion(request.getGuidelinesVersion())
                        .aviroCredits(100)
                        .build();

        userRepository.save(user);
        sendSignupCode(user);
        log.info("New user registered, waiting for email code: {}", email);

        return ApiResponse.success(
                "We sent a 6-digit code to " + email + ". Enter it to finish signing up.",
                pendingVerification(user));
    }

    private void sendSignupCode(User user) {
        if (!sendSignupCodeUnlessRecent(user)) {
            throw new AviroException(
                    "We just sent a code to "
                            + user.getEmail()
                            + ". Please wait a minute before asking again.");
        }
    }

    private boolean sendSignupCodeUnlessRecent(User user) {
        String email = user.getEmail();
        if (attempts.increment("aviro:code-sent:" + email, CODE_COOLDOWN) > 1) {
            return false;
        }
        if (attempts.increment("aviro:code-hour:" + email, Duration.ofHours(1))
                > MAX_CODES_PER_HOUR) {
            throw new AviroException(
                    "Too many codes sent to this email. Please try again in an hour.");
        }
        String otp = otpService.generateAndSaveOtp(VERIFY_OTP_PREFIX + email);
        if (!emailService.sendVerificationEmailNow(email, user.getFullName(), otp)) {
            otpService.discard(VERIFY_OTP_PREFIX + email);
            throw new AviroException(
                    "We couldn't send the verification email right now. Please try again in a few"
                            + " minutes.");
        }
        return true;
    }

    private AuthResponse pendingVerification(User user) {
        return AuthResponse.builder()
                .user(
                        AuthResponse.UserResponse.builder()
                                .email(user.getEmail())
                                .fullName(user.getFullName())
                                .isVerified(false)
                                .build())
                .build();
    }

    @Override
    public ApiResponse<AuthResponse> login(AuthRequest.Login request) {

        String email = normalizeEmail(request.getEmail());
        String failKey = "aviro:login-fail:" + email;

        if (attempts.current(failKey, LOGIN_LOCK_WINDOW) >= MAX_FAILED_LOGINS) {
            long minutes = (attempts.secondsLeftInWindow(LOGIN_LOCK_WINDOW) + 59) / 60;
            throw new AviroException(
                    "Too many wrong passwords for this account. Try again in "
                            + minutes
                            + (minutes == 1 ? " minute" : " minutes")
                            + ", or reset your password.");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword()));
        } catch (BadCredentialsException e) {
            long failed = attempts.increment(failKey, LOGIN_LOCK_WINDOW);
            if (failed >= MAX_FAILED_LOGINS) {
                log.warn("Login locked for {} after {} wrong passwords", email, failed);
            }
            throw e;
        }
        attempts.reset(failKey, LOGIN_LOCK_WINDOW);

        User user =
                userRepository
                        .findByEmailNormalized(email)
                        .orElseThrow(() -> new AviroException("User not found"));

        if (!user.getIsActive()) {
            throw new AviroException("Account is deactivated. Contact support.");
        }

        if (!Boolean.TRUE.equals(user.getIsVerified())) {
            boolean sent = sendSignupCodeUnlessRecent(user);
            return ApiResponse.success(
                    sent
                            ? "Please verify your email first. We sent a new 6-digit code to "
                                    + email
                                    + "."
                            : "Please verify your email first. Use the code we just sent to "
                                    + email
                                    + ".",
                    pendingVerification(user));
        }

        log.info("Login successful: {}", email);
        return ApiResponse.success("Login successful", buildAuthResponse(user));
    }

    @Override
    @Transactional
    public ApiResponse<AuthResponse> verifyOtp(AuthRequest.VerifyOtp request) {

        String email = normalizeEmail(request.getEmail());

        boolean valid = otpService.verifyOtp(VERIFY_OTP_PREFIX + email, request.getOtp());

        if (!valid) {
            throw new AviroException(
                    "Wrong or expired code. After 5 wrong tries, ask for a new code.");
        }

        User user =
                userRepository
                        .findByEmailNormalized(email)
                        .orElseThrow(() -> new AviroException("User not found"));

        user.setIsVerified(true);
        if (isCollegeEmail(email)) {
            user.setIsCollegeVerified(true);
        }
        userRepository.save(user);
        log.info("Email verified: {}", email);

        return ApiResponse.success("Email verified. Welcome to AVIRO!", buildAuthResponse(user));
    }

    @Override
    public ApiResponse<String> resendOtp(AuthRequest.ResendOtp request) {

        String email = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmailNormalized(email).orElse(null);
        if (user != null && !Boolean.TRUE.equals(user.getIsVerified())) {
            sendSignupCode(user);
        }
        return ApiResponse.success(
                "If this email is waiting for verification, a new code has been sent.", null);
    }

    @Override
    public ApiResponse<AuthResponse> refreshToken(AuthRequest.RefreshToken request) {

        if (!jwtTokenProvider.validateToken(request.getRefreshToken())
                || !jwtTokenProvider.isRefreshToken(request.getRefreshToken())
                || tokenBlacklistService.isRevoked(request.getRefreshToken())) {
            throw new AviroException("Invalid or expired refresh token");
        }

        String email = jwtTokenProvider.getEmailFromToken(request.getRefreshToken());

        User user =
                userRepository
                        .findByEmail(email)
                        .orElseThrow(() -> new AviroException("User not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new AviroException("This account is no longer active.");
        }

        tokenBlacklistService.revoke(request.getRefreshToken());
        return ApiResponse.success(buildAuthResponse(user));
    }

    @Override
    public ApiResponse<String> forgotPassword(AuthRequest.ForgotPassword request) {

        String email = normalizeEmail(request.getEmail());
        String sentMessage =
                "If an account exists for " + email + ", a 6-digit code has been sent to it.";

        User user = userRepository.findByEmailNormalized(email).orElse(null);
        if (user == null) {
            log.info("Password reset asked for unknown email");
            return ApiResponse.success(sentMessage, null);
        }

        String otp = otpService.generateAndSaveOtp(RESET_OTP_PREFIX + email);
        if (!emailService.sendPasswordResetEmailNow(email, user.getFullName(), otp)) {
            otpService.discard(RESET_OTP_PREFIX + email);
            throw new AviroException(
                    "We couldn't send the email right now. Please try again in a few minutes.");
        }

        return ApiResponse.success(sentMessage, null);
    }

    @Override
    @Transactional
    public ApiResponse<String> resetPassword(AuthRequest.ResetPassword request) {

        String email = normalizeEmail(request.getEmail());

        boolean valid =
                otpService.verifyOtp(
                        RESET_OTP_PREFIX + email,
                        request.getOtp() == null ? "" : request.getOtp().trim());

        if (!valid) {
            throw new AviroException(
                    "Wrong or expired code. After 5 wrong tries, ask for a new code.");
        }

        User user =
                userRepository
                        .findByEmailNormalized(email)
                        .orElseThrow(() -> new AviroException("User not found"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));

        userRepository.save(user);

        tokenBlacklistService.revokeAllFor(user.getEmail());
        attempts.reset("aviro:login-fail:" + user.getEmail(), LOGIN_LOCK_WINDOW);

        return ApiResponse.success(
                "Password changed. Please sign in with your new password.", null);
    }

    @Override
    public ApiResponse<String> logout(String accessToken, String refreshToken) {
        tokenBlacklistService.revoke(accessToken);
        tokenBlacklistService.revoke(refreshToken);
        return ApiResponse.success("Logged out successfully", null);
    }

    @Override
    @Transactional
    public ApiResponse<String> sendCollegeEmailOtp(
            String userEmail, AuthRequest.SendCollegeEmailOtp request) {

        User user =
                userRepository
                        .findByEmail(userEmail)
                        .orElseThrow(() -> new AviroException("User not found"));

        String collegeEmail = request.getCollegeEmail().trim().toLowerCase();

        if (!isCollegeEmail(collegeEmail)) {
            throw new AviroException(
                    "Please use your college email (ending in .edu.in, .ac.in or .edu)");
        }

        String otp = otpService.generateAndSaveOtp(COLLEGE_OTP_PREFIX + collegeEmail);

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
    public ApiResponse<String> verifyCollegeEmailOtp(
            String userEmail, AuthRequest.VerifyCollegeEmailOtp request) {

        String collegeEmail = request.getCollegeEmail().trim().toLowerCase();

        if (!isCollegeEmail(collegeEmail)) {
            throw new AviroException("Invalid college email domain");
        }

        boolean valid = otpService.verifyOtp(COLLEGE_OTP_PREFIX + collegeEmail, request.getOtp());

        if (!valid) {
            throw new AviroException("Invalid or expired OTP");
        }

        User user =
                userRepository
                        .findByEmail(userEmail)
                        .orElseThrow(() -> new AviroException("User not found"));

        user.setIsCollegeVerified(true);

        userRepository.save(user);

        return ApiResponse.success("College verified successfully! 🎓", null);
    }

    private String normalizeEmail(String email) {

        return email == null ? null : email.trim().toLowerCase();
    }

    private boolean isCollegeEmail(String email) {

        return email != null && COLLEGE_DOMAIN_PATTERN.matcher(email.trim()).matches();
    }

    private AuthResponse buildAuthResponse(User user) {

        return AuthResponse.builder()
                .accessToken(jwtTokenProvider.generateAccessToken(user.getEmail()))
                .refreshToken(jwtTokenProvider.generateRefreshToken(user.getEmail()))
                .tokenType("Bearer")
                .user(
                        AuthResponse.UserResponse.builder()
                                .id(user.getId())
                                .fullName(user.getFullName())
                                .email(user.getEmail())
                                .gender(user.getGender())
                                .role(user.getRole())
                                .collegeName(user.getCollegeName())
                                .isVerified(user.getIsVerified())
                                .isCollegeVerified(user.getIsCollegeVerified())
                                .guidelinesVersion(user.getGuidelinesVersion())
                                .rating(user.getRating())
                                .aviroCredits(user.getAviroCredits())
                                .build())
                .build();
    }
}
