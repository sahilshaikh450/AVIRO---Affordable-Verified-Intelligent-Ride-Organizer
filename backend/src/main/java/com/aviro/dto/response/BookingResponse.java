package com.aviro.dto.response;

import com.aviro.enums.BookingStatus;
import com.aviro.enums.PaymentStatus;
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
    private LocalDateTime departureTime;
    private Integer seatsBooked;
    private Double totalAmount;
    private BookingStatus status;
    private PaymentStatus paymentStatus;
    private String pickupPoint;
    private RideResponse.DriverInfo driver;
    private RiderInfo rider; // <-- ADDED: so driver can see who booked
    private LocalDateTime createdAt;

    @Data
    @Builder
    public static class RiderInfo {
        private Long id;
        private String fullName;
        private com.aviro.enums.Gender gender;
        private String collegeName;
        private String profilePicUrl;
        private Double rating;
    }
}