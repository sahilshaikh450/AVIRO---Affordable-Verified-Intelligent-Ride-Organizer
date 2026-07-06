package com.aviro.dto.request;

import com.aviro.enums.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VehicleRequest {
    @NotNull private VehicleType vehicleType;
    @NotBlank private String registrationNumber;
    private String make;
    private String model;
    private String color;
    private Integer year;
    @NotNull private Integer totalSeats;
}
