package com.aviro.dto.response;

import com.aviro.enums.BookingStatus;
import com.aviro.enums.Gender;
import com.aviro.enums.PaymentStatus;
import com.aviro.enums.TripStage;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class BookingResponse {
    private Long id;
    private Long rideId;
    private String fromLocation;
    private String toLocation;
    private Double fromLat;
    private Double fromLng;
    private Double toLat;
    private Double toLng;
    private LocalDateTime departureTime;
    private Integer seatsBooked;
    private Double totalAmount;
    private BookingStatus status;
    private PaymentStatus paymentStatus;
    private String paymentMethod;
    private String paymentReference;
    private String pickupPoint;
    private Double pickupLat;
    private Double pickupLng;
    private TripStage tripStage;
    private RideResponse.DriverInfo driver;
    private RiderInfo rider;
    private LocalDateTime createdAt;

    @Data
    @Builder
    public static class RiderInfo {
        private Long id;
        private String fullName;
        private Gender gender;
        private String collegeName;
        private String department;      // ✅ Branch/Department
        private String yearOfStudy;     // ✅ Year
        private String phone;           // ✅ Mobile number
        private String profilePicUrl;
        private Double rating;
        private Integer totalRides;
    }
}