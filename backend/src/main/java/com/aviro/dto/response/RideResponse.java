package com.aviro.dto.response;

import com.aviro.enums.Gender;
import com.aviro.enums.RideStatus;
import com.aviro.enums.VehicleType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RideResponse {
    private Long id;
    private DriverInfo driver;
    private String fromLocation;
    private Double fromLat;
    private Double fromLng;
    private String toLocation;
    private Double toLat;
    private Double toLng;
    private LocalDateTime departureTime;
    private Integer totalSeats;
    private Integer availableSeats;
    private Double pricePerSeat;
    private RideStatus status;
    private Boolean isRecurring;
    private String recurringDays;
    private Boolean womenOnly;
    private Gender allowedGender;
    private String notes;
    private LocalDateTime createdAt;

    // RideResponse.java mein DriverInfo class update karo — ye fields add karo:

    @Data
    @Builder
    public static class DriverInfo {
        private Long id;
        private String fullName;
        private Gender gender;
        private String genderLabel;
        private Double rating;
        private Integer totalRides;
        private String collegeName;
        private String department;      // ✅ Branch
        private String yearOfStudy;     // ✅ Year
        private String phone;           // ✅ Mobile (shown after confirm only)
        private String profilePicUrl;
        private Boolean isCollegeVerified;
        private String vehicleType;
        private String vehicleModel;
        private String vehicleColor;
        private String vehicleRegistrationNumber; // ✅ Vehicle number
    }
}