package com.aviro.dto.request;

import com.aviro.enums.Gender;
import lombok.Data;

import java.util.List;

@Data
public class ProfileUpdateRequest {
    private String fullName;
    private String phone;
    private String locality;
    private Double homeLat;
    private Double homeLng;
    private String department;
    private String yearOfStudy;
    private Boolean womenOnlyMode;
    private List<String> emergencyContacts;
}
