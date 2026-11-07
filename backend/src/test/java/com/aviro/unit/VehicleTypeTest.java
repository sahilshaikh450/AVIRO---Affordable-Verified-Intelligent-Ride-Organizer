package com.aviro.unit;

import com.aviro.enums.VehicleType;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VehicleTypeTest {

    @Test
    void onlyBikesScootiesAndCarsAreOffered() {
        assertThat(VehicleType.BIKE.supported()).isTrue();
        assertThat(VehicleType.SCOOTY.supported()).isTrue();
        assertThat(VehicleType.CAR.supported()).isTrue();
        assertThat(VehicleType.AUTO.supported()).isFalse();
        assertThat(VehicleType.VAN.supported()).isFalse();
    }

    @Test
    void twoWheelersTakeOneRiderAndCarsFour() {
        assertThat(VehicleType.BIKE.maxRiders()).isEqualTo(1);
        assertThat(VehicleType.SCOOTY.maxRiders()).isEqualTo(1);
        assertThat(VehicleType.CAR.maxRiders()).isEqualTo(4);
    }
}
