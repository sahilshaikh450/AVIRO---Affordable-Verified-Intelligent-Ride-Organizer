package com.aviro.dto.response;

import com.aviro.enums.VehicleType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VehicleResponse {
    private Long id;
    private VehicleType vehicleType;
    private String registrationNumber;
    private String make;
    private String model;
    private String color;
    private Integer year;
    private Integer totalSeats;
    private Boolean isVerified;
    // Own vehicle only: the uploaded photos (served to the owner and admins)
    private String platePhotoUrl;
    private String licencePhotoUrl;
}
