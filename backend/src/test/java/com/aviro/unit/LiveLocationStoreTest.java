package com.aviro.unit;

import static org.assertj.core.api.Assertions.assertThat;

import com.aviro.service.LiveLocationStore;

import org.junit.jupiter.api.Test;

class LiveLocationStoreTest {

    @Test
    void acceptsRealCoordinatesOnly() {
        assertThat(LiveLocationStore.valid(18.52, 73.85)).isTrue();
        assertThat(LiveLocationStore.valid(-90.0, 180.0)).isTrue();
        assertThat(LiveLocationStore.valid(91.0, 73.0)).isFalse();
        assertThat(LiveLocationStore.valid(18.0, -181.0)).isFalse();
        assertThat(LiveLocationStore.valid(null, 73.0)).isFalse();
        assertThat(LiveLocationStore.valid(Double.NaN, 73.0)).isFalse();
    }

    @Test
    void keepsTheLatestPositionPerBookingAndSide() {
        LiveLocationStore store = new LiveLocationStore();
        store.driverAt(7L, 18.5, 73.8);
        store.driverAt(7L, 18.6, 73.9);
        store.riderAt(7L, 18.1, 73.1);
        assertThat(store.driver(7L).lat()).isEqualTo(18.6);
        assertThat(store.rider(7L).lng()).isEqualTo(73.1);
        assertThat(store.driver(8L)).isNull();
    }
}
