package com.aviro.dto.request;

import jakarta.validation.constraints.*;

import lombok.Data;

public class BookingRequest {

    @Data
    public static class Create {
        @NotNull private Long rideId;

        @NotNull
        @Min(1)
        @Max(4)
        private Integer seatsBooked = 1;

        @Size(max = 200)
        @Pattern(regexp = "^[^<>]*$", message = "Use plain text: < and > are not allowed")
        private String pickupPoint;

        private Double pickupLat;
        private Double pickupLng;
    }

    @Data
    public static class UpdateStatus {
        @NotBlank private String status;
    }
}
