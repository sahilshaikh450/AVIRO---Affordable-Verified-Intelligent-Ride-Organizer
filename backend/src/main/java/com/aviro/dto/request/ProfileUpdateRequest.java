package com.aviro.dto.request;

import com.aviro.enums.Gender;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;


@Data
public class ProfileUpdateRequest {
    @Size(min = 2, max = 60, message = "Name must be 2 to 60 characters")
    @Pattern(regexp = "^[\\p{L} .'-]+$", message = "Name can only have letters, spaces, dots and hyphens")
    private String fullName;
    @Pattern(regexp = "^$|^(\\+91)?[6-9]\\d{9}$", message = "Enter a valid 10-digit mobile number")
    private String phone;
    // Format is checked in UserServiceImpl (blank clears it)
    @Size(max = 100)
    private String upiId;
    @Size(max = 150)
    private String locality;
    private Double homeLat;
    private Double homeLng;
    @Size(max = 80)
    private String department;
    @Size(max = 10)
    private String yearOfStudy;
    private Boolean womenOnlyMode;
    // Emergency contacts are not part of the profile: see POST /safety/emergency-contacts
}
