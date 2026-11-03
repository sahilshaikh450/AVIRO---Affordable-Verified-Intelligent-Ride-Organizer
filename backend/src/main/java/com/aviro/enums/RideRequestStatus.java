package com.aviro.enums;

public enum RideRequestStatus {
    ACTIVE,     // waiting for a matching ride
    MATCHED,    // a ride was posted and the rider was told
    CANCELLED   // the rider removed it
}
