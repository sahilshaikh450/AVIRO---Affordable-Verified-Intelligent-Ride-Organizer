package com.aviro.dto.request;

import com.aviro.enums.VehicleType;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ReviewRequest {
    @NotNull private Long bookingId;
    @NotNull private Long revieweeId;
    @NotNull @DecimalMin("1.0") @DecimalMax("5.0")
    private Double rating;
    private String comment;
}
