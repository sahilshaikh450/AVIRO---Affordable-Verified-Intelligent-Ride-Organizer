package com.aviro.service.impl;

import com.aviro.dto.request.RideRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.RideResponse;
import com.aviro.entity.Booking;
import com.aviro.entity.Ride;
import com.aviro.entity.User;
import com.aviro.entity.Vehicle;
import com.aviro.enums.BookingStatus;
import com.aviro.enums.Gender;
import com.aviro.enums.RideStatus;
import com.aviro.exception.AviroException;
import com.aviro.repository.BookingRepository;
import com.aviro.repository.RideRepository;
import com.aviro.repository.UserRepository;
import com.aviro.repository.VehicleRepository;
import com.aviro.service.NotificationService;
import com.aviro.service.RideService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RideServiceImpl implements RideService {

    private final RideRepository    rideRepository;
    private final UserRepository    userRepository;
    private final BookingRepository bookingRepository;
    private final VehicleRepository vehicleRepository;
    private final NotificationService notificationService;

    // Status changes a driver may make; cancelled and completed rides are final
    private static final Map<RideStatus, Set<RideStatus>> ALLOWED_MOVES = Map.of(
        RideStatus.PENDING,     Set.of(RideStatus.ACTIVE, RideStatus.IN_PROGRESS, RideStatus.COMPLETED, RideStatus.CANCELLED),
        RideStatus.ACTIVE,      Set.of(RideStatus.IN_PROGRESS, RideStatus.COMPLETED, RideStatus.CANCELLED),
        RideStatus.IN_PROGRESS, Set.of(RideStatus.COMPLETED)
    );

    // ── CREATE RIDE ──────────────────────────────────
    @Override
    @Transactional
    public ApiResponse<RideResponse> createRide(String email, RideRequest.Create request) {
        User driver = getUser(email);

        // 1. College ID must be verified
        if (!Boolean.TRUE.equals(driver.getIsCollegeVerified())) {
            throw new AviroException(
                "⚠️ College ID not verified! Please upload your college ID in Profile before posting a ride."
            );
        }

        // 2. Must have a registered vehicle
        Vehicle vehicle = vehicleRepository.findByUserId(driver.getId()).orElse(null);
        if (vehicle == null) {
            throw new AviroException(
                "🚗 No vehicle registered! Please add your vehicle in Profile before posting a ride."
            );
        }

        // 3. Vehicle must be verified
        if (!Boolean.TRUE.equals(vehicle.getIsVerified())) {
            throw new AviroException(
                "🚗 Vehicle not verified yet! Pending admin verification."
            );
        }

        // 4. Departure time at least 15 mins in future
        if (request.getDepartureTime() == null ||
            request.getDepartureTime().isBefore(LocalDateTime.now().plusMinutes(15))) {
            throw new AviroException("⏰ Departure time must be at least 15 minutes from now.");
        }

        // 5. Seats must be valid — ✅ field name: totalSeats
        if (request.getTotalSeats() == null ||
            request.getTotalSeats() < 1 ||
            request.getTotalSeats() > 6) {
            throw new AviroException("🪑 Seats must be between 1 and 6.");
        }

        // 6. Price must be valid
        if (request.getPricePerSeat() == null ||
            request.getPricePerSeat() < 1 ||
            request.getPricePerSeat() > 5000) {
            throw new AviroException("💰 Price per seat must be between ₹1 and ₹5000.");
        }

        // 7. From and To must be different
        if (request.getFromLocation() != null && request.getToLocation() != null &&
            request.getFromLocation().trim().equalsIgnoreCase(request.getToLocation().trim())) {
            throw new AviroException("📍 Pickup and drop locations cannot be the same.");
        }

        // 8. No duplicate upcoming ride on same route (yesterday's ride doesn't block today's)
        LocalDateTime now = LocalDateTime.now();
        List<Ride> existingRides = rideRepository.findByDriverAndStatus(driver.getId(), RideStatus.PENDING);
        boolean duplicate = existingRides.stream().anyMatch(r ->
            r.getDepartureTime() != null && r.getDepartureTime().isAfter(now) &&
            r.getFromLocation().equalsIgnoreCase(request.getFromLocation().trim()) &&
            r.getToLocation().equalsIgnoreCase(request.getToLocation().trim())
        );
        if (duplicate) {
            throw new AviroException("🔁 You already have an active ride on this route.");
        }

        // ✅ Build ride — totalSeats used for both availableSeats and totalSeats
        Ride ride = Ride.builder()
                .driver(driver)
                .fromLocation(request.getFromLocation().trim())
                .toLocation(request.getToLocation().trim())
                .departureTime(request.getDepartureTime())
                .availableSeats(request.getTotalSeats())   // ✅ totalSeats → availableSeats
                .totalSeats(request.getTotalSeats())
                .pricePerSeat(request.getPricePerSeat())
                .status(RideStatus.PENDING)
                .womenOnly(Boolean.TRUE.equals(request.getWomenOnly()))
                .fromLat(request.getFromLat())
                .fromLng(request.getFromLng())
                .toLat(request.getToLat())
                .toLng(request.getToLng())
                .notes(request.getNotes())
                .isRecurring(Boolean.TRUE.equals(request.getIsRecurring()))
                .recurringDays(request.getRecurringDays())
                .allowedGender(request.getAllowedGender())
                .build();

        rideRepository.save(ride);
        log.info("✅ Ride created: driver={} route={}→{}", email, ride.getFromLocation(), ride.getToLocation());
        return ApiResponse.success("Ride posted successfully! 🚀", toResponse(ride, vehicle));
    }

    // ── SEARCH RIDES ─────────────────────────────────
    @Override
    public ApiResponse<List<RideResponse>> searchRides(RideRequest.Search request) {
        // ✅ correct field: seatsNeeded
        int seatsNeeded = request.getSeatsNeeded() != null ? request.getSeatsNeeded() : 1;

        // Never show rides that have already left
        LocalDateTime now  = LocalDateTime.now();
        LocalDateTime from = request.getDepartureTime() != null && request.getDepartureTime().minusHours(2).isAfter(now)
            ? request.getDepartureTime().minusHours(2) : now;
        LocalDateTime to   = request.getDepartureTime() != null
            ? request.getDepartureTime().plusHours(2)  : LocalDateTime.now().plusDays(7);

        List<Ride> rides = rideRepository.searchRides(
            seatsNeeded,
            from,
            to,
            Boolean.TRUE.equals(request.getWomenOnly()),
            request.getDriverGender()   // ✅ correct field: driverGender
        );

        List<Ride> matched = rides.stream()
            // ✅ correct field: fromLocation / toLocation
            .filter(r -> request.getFromLocation() == null ||
                r.getFromLocation().toLowerCase().contains(request.getFromLocation().toLowerCase()))
            .filter(r -> request.getToLocation() == null ||
                r.getToLocation().toLowerCase().contains(request.getToLocation().toLowerCase()))
            // Price filter
            .filter(r -> request.getMaxPrice() == null ||
                r.getPricePerSeat() <= request.getMaxPrice())
            .collect(Collectors.toList());
        List<RideResponse> result = toResponses(matched);

        return ApiResponse.success(result);
    }

    // ── GET RIDE BY ID ───────────────────────────────
    @Override
    public ApiResponse<RideResponse> getRideById(Long rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new AviroException("Ride not found"));
        return ApiResponse.success(toResponse(ride, getVehicleForDriver(ride.getDriver().getId())));
    }

    // ── GET MY RIDES ─────────────────────────────────
    @Override
    public ApiResponse<List<RideResponse>> getMyRides(String email) {
        User driver     = getUser(email);
        Vehicle vehicle = vehicleRepository.findByUserId(driver.getId()).orElse(null);
        List<Ride> rides = rideRepository.findByDriverId(driver.getId());
        return ApiResponse.success(
            rides.stream()
                .sorted((a, b) -> b.getDepartureTime().compareTo(a.getDepartureTime()))
                .map(r -> toResponse(r, vehicle))
                .collect(Collectors.toList())
        );
    }

    // ── UPDATE RIDE STATUS ───────────────────────────
    @Override
    @Transactional
    public ApiResponse<RideResponse> updateRideStatus(String email, Long rideId, String status) {
        User driver = getUser(email);
        Ride ride   = rideRepository.findById(rideId)
                .orElseThrow(() -> new AviroException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new AviroException("🚫 You are not authorized to update this ride.");
        }

        RideStatus newStatus;
        try {
            newStatus = RideStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new AviroException("Invalid ride status: " + status);
        }

        if (!ALLOWED_MOVES.getOrDefault(ride.getStatus(), Set.of()).contains(newStatus)) {
            throw new AviroException("A " + ride.getStatus().name().toLowerCase() + " ride can't be marked "
                    + newStatus.name().toLowerCase());
        }

        if (newStatus == RideStatus.CANCELLED) {
            cancelRide(email, rideId);
            return ApiResponse.success("Ride status updated", toResponse(ride, getVehicleForDriver(driver.getId())));
        }

        ride.setStatus(newStatus);
        rideRepository.save(ride);
        return ApiResponse.success("Ride status updated", toResponse(ride, getVehicleForDriver(driver.getId())));
    }

    // ── CANCEL RIDE ──────────────────────────────────
    @Override
    @Transactional
    public ApiResponse<String> cancelRide(String email, Long rideId) {
        User driver = getUser(email);
        Ride ride   = rideRepository.findById(rideId)
                .orElseThrow(() -> new AviroException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new AviroException("🚫 You are not authorized to cancel this ride.");
        }

        if (ride.getStatus() == RideStatus.CANCELLED || ride.getStatus() == RideStatus.COMPLETED) {
            throw new AviroException("This ride is already " + ride.getStatus().name().toLowerCase());
        }

        long confirmed = bookingRepository.countByRideIdAndStatus(rideId, BookingStatus.CONFIRMED);
        if (confirmed > 0) {
            throw new AviroException("❌ Cannot cancel — " + confirmed + " confirmed booking(s) exist.");
        }

        ride.setStatus(RideStatus.CANCELLED);
        rideRepository.save(ride);

        // Pending requests can't go anywhere now: close them and tell the riders
        for (Booking booking : bookingRepository.findActiveBookingsForRide(rideId)) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setTripStage(null);
            bookingRepository.save(booking);
            try {
                notificationService.send(
                        booking.getRider().getId(),
                        "Ride Cancelled",
                        driver.getFullName() + " cancelled the ride from " + ride.getFromLocation() +
                                " to " + ride.getToLocation() + ". Try finding another ride!",
                        "BOOKING_CANCELLED",
                        String.valueOf(booking.getId())
                );
            } catch (Exception e) {
                log.warn("In-app notification failed: {}", e.getMessage());
            }
        }
        log.info("Ride cancelled: rideId={} driver={}", rideId, email);
        return ApiResponse.success("Ride cancelled successfully", null);
    }

    // ── NEARBY RIDES ─────────────────────────────────
    @Override
    public ApiResponse<List<RideResponse>> getNearbyRides(Double lat, Double lng, Integer seats) {
        List<Ride> rides = rideRepository.findNearbyRides(
            lat, lng,
            5.0,
            seats != null ? seats : 1,
            LocalDateTime.now()
        );
        return ApiResponse.success(toResponses(rides));
    }

    // ── ESTIMATE FARE ────────────────────────────────
    @Override
    public ApiResponse<Double> estimateFare(String from, String to, Integer seats) {
        double estimatedKm = 7.0;
        double baseFare    = estimatedKm * 15;
        double perSeatFare = baseFare / (seats != null ? seats : 1);
        log.info("Fare estimate: from={} to={} seats={} fare=₹{}", from, to, seats, perSeatFare);
        return ApiResponse.success("Estimated fare per seat (shared)", perSeatFare);
    }

    // ── Helpers ──────────────────────────────────────
    private Vehicle getVehicleForDriver(Long driverId) {
        return vehicleRepository.findByUserId(driverId).orElse(null);
    }

    // Lists: one query for all drivers' vehicles instead of one per ride
    private List<RideResponse> toResponses(List<Ride> rides) {
        Set<Long> driverIds = rides.stream().map(r -> r.getDriver().getId()).collect(Collectors.toSet());
        Map<Long, Vehicle> vehicles = driverIds.isEmpty() ? Map.of()
                : vehicleRepository.findByUserIdIn(driverIds).stream()
                        .collect(Collectors.toMap(v -> v.getUser().getId(), v -> v, (a, b) -> a));
        return rides.stream()
                .map(r -> toResponse(r, vehicles.get(r.getDriver().getId())))
                .collect(Collectors.toList());
    }

    private RideResponse toResponse(Ride ride, Vehicle vehicle) {
        User driver = ride.getDriver();

        String genderLabel = switch (driver.getGender()) {
            case MALE   -> "Male driver";
            case FEMALE -> "Female driver";
            default     -> "Driver";
        };

        return RideResponse.builder()
                .id(ride.getId())
                .fromLocation(ride.getFromLocation())
                .toLocation(ride.getToLocation())
                .departureTime(ride.getDepartureTime())
                .availableSeats(ride.getAvailableSeats())
                .totalSeats(ride.getTotalSeats())
                .pricePerSeat(ride.getPricePerSeat())
                .status(ride.getStatus())
                .womenOnly(ride.getWomenOnly())
                .notes(ride.getNotes())
                .fromLat(ride.getFromLat())
                .fromLng(ride.getFromLng())
                .toLat(ride.getToLat())
                .toLng(ride.getToLng())
                .driver(RideResponse.DriverInfo.builder()
                        .id(driver.getId())
                        .fullName(driver.getFullName())
                        .gender(driver.getGender())
                        .genderLabel(genderLabel)
                        .rating(driver.getRating())
                        .totalRides(driver.getTotalRides())
                        .collegeName(driver.getCollegeName())
                        .department(driver.getDepartment())
                        .yearOfStudy(driver.getYearOfStudy())
                        .profilePicUrl(driver.getProfilePicUrl())
                        .isCollegeVerified(driver.getIsCollegeVerified())
                        .vehicleType(vehicle != null && vehicle.getVehicleType() != null ? vehicle.getVehicleType().name() : null)
                        .vehicleModel(vehicle != null ? vehicle.getModel() : null)
                        .vehicleColor(vehicle != null ? vehicle.getColor() : null)
                        .vehicleRegistrationNumber(vehicle != null ? vehicle.getRegistrationNumber() : null)
                        .build())
                .build();
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AviroException("User not found"));
    }
}