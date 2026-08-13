package com.aviro.dto.response;

import com.aviro.enums.Gender;
import com.aviro.enums.Role;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private UserResponse user;

    @Data
    @Builder
    public static class UserResponse {
        private Long id;
        private String fullName;
        private String email;
        private Gender gender;
        private Role role;
        private String collegeName;
        private Boolean isVerified;
        private Boolean isCollegeVerified;
        private Double rating;
        private Integer aviroCredits;
    }
}
