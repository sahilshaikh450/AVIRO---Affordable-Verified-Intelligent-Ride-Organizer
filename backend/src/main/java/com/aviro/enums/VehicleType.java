package com.aviro.enums;

public enum VehicleType {
    BIKE,
    SCOOTY,
    CAR,
    AUTO,
    VAN;

    public boolean supported() {
        return this == BIKE || this == SCOOTY || this == CAR;
    }

    public int maxRiders() {
        return this == CAR ? 4 : 1;
    }
}
