package com.aviro.enums;

public enum VehicleType {
    BIKE, SCOOTY, CAR,
    // No longer offered for new vehicles or rides; kept so older saved vehicles still load
    AUTO, VAN;

    // Bikes, scooties and cars only
    public boolean supported() {
        return this == BIKE || this == SCOOTY || this == CAR;
    }

    // Riders it can carry besides the driver: one pillion on two wheelers, up to four in a car
    public int maxRiders() {
        return this == CAR ? 4 : 1;
    }
}
