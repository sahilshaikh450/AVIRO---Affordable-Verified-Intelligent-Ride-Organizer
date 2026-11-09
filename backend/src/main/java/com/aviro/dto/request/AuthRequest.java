package com.aviro.dto.request;

import com.aviro.enums.Gender;
import com.aviro.enums.Role;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import lombok.Data;

public class AuthRequest {

    @Data
    public static class Register {
        @NotBlank(message = "Full name is required")
        @Size(min = 2, max = 60, message = "Name must be 2 to 60 characters")
        @Pattern(
                regexp = "^[\\p{L} .'-]+$",
                message = "Name can only have letters, spaces, dots and hyphens")
        private String fullName;

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        @Size(max = 120)
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$",
                message = "Password needs at least one letter and one number")
        private String password;

        @Pattern(
                regexp = "^$|^(\\+91)?[6-9]\\d{9}$",
                message = "Enter a valid 10-digit mobile number")
        private String phone;

        @NotNull(message = "Gender is required")
        private Gender gender;

        @NotNull(message = "Role is required")
        private Role role;

        @NotBlank(message = "College name is required")
        @Size(max = 150)
        private String collegeName;

        @Size(max = 80)
        private String department;

        @Size(max = 10)
        private String yearOfStudy;

        @NotBlank(message = "Locality is required")
        @Size(max = 150)
        private String locality;

        private Double homeLat;
        private Double homeLng;

        @NotNull(message = "Please accept the community guidelines to create an account")
        @AssertTrue(message = "Please accept the community guidelines to create an account")
        private Boolean acceptedGuidelines;

        @NotBlank(message = "Please accept the community guidelines to create an account")
        @Size(max = 20)
        @Pattern(regexp = "^[0-9A-Za-z.-]+$")
        private String guidelinesVersion;
    }

    @Data
    public static class Login {
        @NotBlank(message = "Email is required")
        @Email
        private String email;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    public static class LoginVerifyOtp {
        @NotBlank @Email private String email;
        @NotBlank private String otp;
    }

    @Data
    public static class VerifyOtp {
        @NotBlank private String email;
        @NotBlank private String otp;
    }

    @Data
    public static class ResendOtp {
        @NotBlank @Email private String email;
    }

    @Data
    public static class RefreshToken {
        @NotBlank private String refreshToken;
    }

    @Data
    public static class DeleteAccount {
        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    public static class Logout {
        private String refreshToken;
    }

    @Data
    public static class ForgotPassword {
        @NotBlank @Email private String email;
    }

    @Data
    public static class ResetPassword {
        @NotBlank private String email;
        @NotBlank private String otp;

        @NotBlank
        @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$",
                message = "Password needs at least one letter and one number")
        private String newPassword;
    }

    @Data
    public static class SendCollegeEmailOtp {
        @NotBlank
        @Email(message = "Invalid email format")
        private String collegeEmail;
    }

    @Data
    public static class VerifyCollegeEmailOtp {
        @NotBlank @Email private String collegeEmail;
        @NotBlank private String otp;
    }
}
