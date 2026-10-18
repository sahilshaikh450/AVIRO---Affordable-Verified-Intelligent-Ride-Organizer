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

    // Keep these because OTP features are still present
    private final OtpService otpService;
    private final EmailService emailService;

    // Separate Redis key namespaces so one OTP can't be used for another flow
    private static final String VERIFY_OTP_PREFIX = "verify:";
    private static final String RESET_OTP_PREFIX = "reset:";
    private static final String LOGIN_OTP_PREFIX = "login:";
    private static final String COLLEGE_OTP_PREFIX = "college:";

    private static final Pattern COLLEGE_DOMAIN_PATTERN =
            Pattern.compile(
                    "^[\\w.+-]+@[\\w-]+(\\.[\\w-]+)*\\.edu\\.in$",
                    Pattern.CASE_INSENSITIVE
            );

    // =========================================================
    // REGISTER
    // =========================================================

    @Override
    @Transactional
    public ApiResponse<AuthResponse> register(AuthRequest.Register request) {

        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new AviroException("Email already registered. Please login.");
        }

        User user = User.builder()
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

                // TEMPORARY: registration OTP bypass
                .isVerified(true)

                .aviroCredits(100)
                .build();

        // Auto college verify for .edu.in email
        if (isCollegeEmail(email)) {
            user.setIsCollegeVerified(true);
        }

        userRepository.save(user);

        log.info(
                "New user registered without OTP verification: {}",
                email
        );

        // Directly return JWT
        return ApiResponse.success(
                "Registration successful!",
                buildAuthResponse(user)
        );
    }

    // =========================================================
    // LOGIN
    // =========================================================

    @Override
    public ApiResponse<AuthResponse> login(AuthRequest.Login request) {

        String email = normalizeEmail(request.getEmail());

        // Verify email + password
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AviroException("User not found"));

        if (!user.getIsActive()) {
            throw new AviroException(
                    "Account is deactivated. Contact support."
            );
        }

        // TEMPORARY: OTP bypass
        log.info(
                "Login successful without OTP: {}",
                email
        );

        // Directly generate access + refresh token
        return ApiResponse.success(
                "Login successful",
                buildAuthResponse(user)
        );
    }

    // =========================================================
    // LOGIN OTP
    // Keep this method for later OTP restoration
    // =========================================================

    @Override
    public ApiResponse<AuthResponse> verifyLoginOtp(
            AuthRequest.LoginVerifyOtp request) {

        String email = normalizeEmail(request.getEmail());

        boolean valid = otpService.verifyOtp(
                LOGIN_OTP_PREFIX + email,
                request.getOtp()
        );

        if (!valid) {
            throw new AviroException("Invalid or expired OTP");
        }

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AviroException("User not found"));

        log.info(
                "Login OTP verified, issuing token: {}",
                email
        );

        return ApiResponse.success(
                "Login successful",
                buildAuthResponse(user)
        );
    }

    // =========================================================
    // REGISTRATION OTP
    // Keep for later
    // =========================================================

    @Override
    @Transactional
    public ApiResponse<String> verifyOtp(
            AuthRequest.VerifyOtp request) {

        String email = normalizeEmail(request.getEmail());

        boolean valid = otpService.verifyOtp(
                VERIFY_OTP_PREFIX + email,
                request.getOtp()
        );

        if (!valid) {
            throw new AviroException("Invalid or expired OTP");
        }

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AviroException("User not found"));

        user.setIsVerified(true);
        userRepository.save(user);

        return ApiResponse.success(
                "Email verified successfully! Welcome to AVIRO!",
                null
        );
    }

    // =========================================================
    // RESEND REGISTRATION OTP
    // =========================================================

    @Override
    public ApiResponse<String> resendOtp(AuthRequest.ResendOtp request) {

        String email = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AviroException("User not found"));

        if (Boolean.TRUE.equals(user.getIsVerified())) {
            return ApiResponse.success(
                    "Email is already verified",
                    null
            );
        }

        String otp = otpService.generateAndSaveOtp(
                VERIFY_OTP_PREFIX + email
        );

        try {

            emailService.sendVerificationEmail(
                    email,
                    user.getFullName(),
                    otp
            );

        } catch (Exception e) {

            log.warn(
                    "Failed to send verification email: {}",
                    e.getMessage()
            );

            throw new AviroException(
                    "Failed to send OTP. Please try again."
            );
        }

        return ApiResponse.success(
                "OTP sent to " + email,
                null
        );
    }

    // =========================================================
    // REFRESH TOKEN
    // =========================================================

    @Override
    public ApiResponse<AuthResponse> refreshToken(
            AuthRequest.RefreshToken request) {

        if (!jwtTokenProvider.validateToken(request.getRefreshToken())) {
            throw new AviroException(
                    "Invalid or expired refresh token"
            );
        }

        String email = jwtTokenProvider.getEmailFromToken(
                request.getRefreshToken()
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AviroException("User not found"));

        return ApiResponse.success(
                buildAuthResponse(user)
        );
    }

    // =========================================================
    // FORGOT PASSWORD
    // OTP remains enabled here
    // =========================================================

    @Override
    public ApiResponse<String> forgotPassword(
            AuthRequest.ForgotPassword request) {

        String email = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new AviroException(
                                "No account found with this email"
                        )
                );

        String otp = otpService.generateAndSaveOtp(
                RESET_OTP_PREFIX + email
        );

        try {

            emailService.sendPasswordResetEmail(
                    email,
                    user.getFullName(),
                    otp
            );

        } catch (Exception e) {

            log.warn(
                    "Failed to send reset email: {}",
                    e.getMessage()
            );
        }

        return ApiResponse.success(
                "Password reset OTP sent to your email",
                null
        );
    }

    // =========================================================
    // RESET PASSWORD
    // OTP remains enabled here
    // =========================================================

    @Override
    @Transactional
    public ApiResponse<String> resetPassword(
            AuthRequest.ResetPassword request) {

        String email = normalizeEmail(request.getEmail());

        boolean valid = otpService.verifyOtp(
                RESET_OTP_PREFIX + email,
                request.getOtp()
        );

        if (!valid) {
            throw new AviroException(
                    "Invalid or expired OTP"
            );
        }

        User user = userRepository.findByEmailIgnoreCase(
                email
        ).orElseThrow(() ->
                new AviroException("User not found")
        );

        user.setPassword(
                passwordEncoder.encode(
                        request.getNewPassword()
                )
        );

        userRepository.save(user);

        return ApiResponse.success(
                "Password reset successfully. Please login.",
                null
        );
    }

    // =========================================================
    // LOGOUT
    // =========================================================

    @Override
    public ApiResponse<String> logout(String email) {
        return ApiResponse.success(
                "Logged out successfully",
                null
        );
    }

    // =========================================================
    // COLLEGE EMAIL OTP
    // Keep enabled
    // =========================================================

    @Override
    @Transactional
    public ApiResponse<String> sendCollegeEmailOtp(
            String userEmail,
            AuthRequest.SendCollegeEmailOtp request) {

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() ->
                        new AviroException("User not found")
                );

        String collegeEmail = request
                .getCollegeEmail()
                .trim()
                .toLowerCase();

        if (!isCollegeEmail(collegeEmail)) {
            throw new AviroException(
                    "Please use a valid college email ending in .edu.in"
            );
        }

        String otp = otpService.generateAndSaveOtp(
                COLLEGE_OTP_PREFIX + collegeEmail
        );

        try {

            emailService.sendVerificationEmail(
                    collegeEmail,
                    user.getFullName(),
                    otp
            );

        } catch (Exception e) {

            log.warn(
                    "Failed to send college email OTP: {}",
                    e.getMessage()
            );

            throw new AviroException(
                    "Failed to send OTP. Please try again."
            );
        }

        return ApiResponse.success(
                "OTP sent to " + collegeEmail,
                null
        );
    }

    // =========================================================
    // VERIFY COLLEGE EMAIL OTP
    // =========================================================

    @Override
    @Transactional
    public ApiResponse<String> verifyCollegeEmailOtp(
            String userEmail,
            AuthRequest.VerifyCollegeEmailOtp request) {

        String collegeEmail = request
                .getCollegeEmail()
                .trim()
                .toLowerCase();

        if (!isCollegeEmail(collegeEmail)) {
            throw new AviroException(
                    "Invalid college email domain"
            );
        }

        boolean valid = otpService.verifyOtp(
                COLLEGE_OTP_PREFIX + collegeEmail,
                request.getOtp()
        );

        if (!valid) {
            throw new AviroException(
                    "Invalid or expired OTP"
            );
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() ->
                        new AviroException("User not found")
                );

        user.setIsCollegeVerified(true);

        userRepository.save(user);

        return ApiResponse.success(
                "College verified successfully! 🎓",
                null
        );
    }

    // =========================================================
    // COLLEGE EMAIL CHECK
    // =========================================================

    private String normalizeEmail(String email) {

        return email == null ? null : email.trim().toLowerCase();
    }

    private boolean isCollegeEmail(String email) {

        return email != null
                && COLLEGE_DOMAIN_PATTERN
                .matcher(email.trim())
                .matches();
    }

    // =========================================================
    // AUTH RESPONSE
    // =========================================================

    private AuthResponse buildAuthResponse(User user) {

        return AuthResponse.builder()

                .accessToken(
                        jwtTokenProvider.generateAccessToken(
                                user.getEmail()
                        )
                )

                .refreshToken(
                        jwtTokenProvider.generateRefreshToken(
                                user.getEmail()
                        )
                )

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
                                .isCollegeVerified(
                                        user.getIsCollegeVerified()
                                )
                                .rating(user.getRating())
                                .aviroCredits(
                                        user.getAviroCredits()
                                )
                                .build()
                )

                .build();
    }
}
