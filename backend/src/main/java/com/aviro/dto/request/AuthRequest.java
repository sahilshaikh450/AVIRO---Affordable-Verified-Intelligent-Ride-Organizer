package com.aviro.dto.request;

import com.aviro.enums.Gender;
import com.aviro.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthRequest {

    @Data
    public static class Register {
        @NotBlank(message = "Full name is required")
        private String fullName;
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;
        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;
        private String phone;
        @NotNull(message = "Gender is required")
        private Gender gender;
        @NotNull(message = "Role is required")
        private Role role;
        @NotBlank(message = "College name is required")
        private String collegeName;
        private String department;
        private String yearOfStudy;
        @NotBlank(message = "Locality is required")
        private String locality;
        private Double homeLat;
        private Double homeLng;
    }

    @Data
    public static class Login {
        @NotBlank(message = "Email is required")
        @Email
        private String email;
        @NotBlank(message = "Password is required")
        private String password;
    }

    // ── NEW: Step 2 of login - verify the OTP sent after password check ──
    @Data
    public static class LoginVerifyOtp {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String otp;
    }

    @Data
    public static class VerifyOtp {
        @NotBlank
        private String email;
        @NotBlank
        private String otp;
    }

    @Data
    public static class ResendOtp {
        @NotBlank @Email
        private String email;
    }

    @Data
    public static class RefreshToken {
        @NotBlank
        private String refreshToken;
    }

    @Data
    public static class Logout {
        private String refreshToken;
    }

    @Data
    public static class ForgotPassword {
        @NotBlank @Email
        private String email;
    }

    @Data
    public static class ResetPassword {
        @NotBlank private String email;
        @NotBlank private String otp;
        @NotBlank @Size(min = 6)
        private String newPassword;
    }

    // ── NEW: College email verification request ──
    @Data
    public static class SendCollegeEmailOtp {
        @NotBlank
        @Email(message = "Invalid email format")
        private String collegeEmail;
    }

    @Data
    public static class VerifyCollegeEmailOtp {
        @NotBlank
        @Email
        private String collegeEmail;
        @NotBlank
        private String otp;
    }
}