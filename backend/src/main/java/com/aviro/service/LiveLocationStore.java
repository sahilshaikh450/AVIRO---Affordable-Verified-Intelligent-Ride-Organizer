package com.aviro.service;

import com.aviro.security.TtlCache;

import org.springframework.stereotype.Component;

@Component
public class LiveLocationStore {

    public record Position(double lat, double lng, long at) {}

    private static final long KEEP_MS = 10 * 60 * 1000;

    private final TtlCache<Long, Position> drivers = new TtlCache<>(KEEP_MS, 20_000);
    private final TtlCache<Long, Position> riders = new TtlCache<>(KEEP_MS, 20_000);

    public void driverAt(Long bookingId, double lat, double lng) {
        drivers.put(bookingId, new Position(lat, lng, System.currentTimeMillis()));
    }

    public void riderAt(Long bookingId, double lat, double lng) {
        riders.put(bookingId, new Position(lat, lng, System.currentTimeMillis()));
    }

    public Position driver(Long bookingId) {
        return drivers.getIfPresent(bookingId);
    }

    public Position rider(Long bookingId) {
        return riders.getIfPresent(bookingId);
    }

    public static boolean valid(Double lat, Double lng) {
        return lat != null
                && lng != null
                && Math.abs(lat) <= 90
                && Math.abs(lng) <= 180
                && !Double.isNaN(lat)
                && !Double.isNaN(lng);
    }
}
