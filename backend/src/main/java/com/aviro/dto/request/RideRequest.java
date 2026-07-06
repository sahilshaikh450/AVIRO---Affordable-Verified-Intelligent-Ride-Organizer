package com.aviro.dto.request;

import com.aviro.enums.Gender;
import com.aviro.enums.VehicleType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDateTime;

public class RideRequest {

    @Data
    public static class Create {
        @NotBlank(message = "From location is required")
        private String fromLocation;

        @NotNull private Double fromLat;
        @NotNull private Double fromLng;

        @NotBlank(message = "To location is required")
        private String toLocation;

        @NotNull private Double toLat;
        @NotNull private Double toLng;

        @NotNull(message = "Departure time is required")
        @Future(message = "Departure time must be in the future")
        private LocalDateTime departureTime;

        @NotNull
        @Min(value = 1, message = "At least 1 seat required")
        @Max(value = 6, message = "Maximum 6 seats allowed")
        private Integer totalSeats;

        @NotNull
        @DecimalMin(value = "5.0", message = "Minimum price is ₹5")
        private Double pricePerSeat;

        private Boolean isRecurring = false;
        private String recurringDays;
        private Boolean womenOnly = false;
        private Gender allowedGender;
        private String notes;
    }

    @Data
    public static class Search {
        @NotBlank private String fromLocation;
        private Double fromLat;
        private Double fromLng;

        @NotBlank private String toLocation;
        private Double toLat;
        private Double toLng;

        private LocalDateTime departureTime;
        private Integer seatsNeeded = 1;
        private Boolean womenOnly = false;
        private Gender driverGender;
        private Double maxPrice;
    }

    @Data
    public static class UpdateStatus {
        @NotBlank private String status;
    }
}
