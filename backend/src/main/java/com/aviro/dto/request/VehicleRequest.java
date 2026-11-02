package com.aviro.dto.request;

import com.aviro.enums.VehicleType;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class VehicleRequest {
    @NotNull private VehicleType vehicleType;
    @NotBlank
    @Pattern(regexp = "^[A-Za-z0-9 -]{4,15}$", message = "Enter a valid registration number, like MH12AB1234")
    private String registrationNumber;
    @Size(max = 40) private String make;
    @Size(max = 40) private String model;
    @Size(max = 30) private String color;
    @Min(1990) @Max(2100) private Integer year;
    @NotNull @Min(1) @Max(8) private Integer totalSeats;
}
