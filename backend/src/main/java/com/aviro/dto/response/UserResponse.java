package com.aviro.dto.response;

import com.aviro.enums.Gender;
import com.aviro.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private Gender gender;
    private Role role;
    private String collegeName;
    private String department;
    private String yearOfStudy;
    private String locality;
    private String profilePicUrl;
    private Boolean isVerified;
    private Boolean isCollegeVerified;
    private Double rating;
    private Integer totalRides;
    private Integer aviroCredits;
    private Double co2Saved;
    private Boolean womenOnlyMode;
    private LocalDateTime createdAt;
    private VehicleResponse vehicle;
}
