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
import com.aviro.service.RideRequestService;
import com.aviro.service.RideService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RideServiceImpl implements RideService {

    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final VehicleRepository vehicleRepository;
    private final NotificationService notificationService;
    private final RideRequestService rideRequestService;

    private static final int MAX_SEARCH_RESULTS = 50;

    @Value("${aviro.ride.max-price-per-seat:500}")
    private double maxPricePerSeat;

    @Value("${aviro.vehicle.require-verification:false}")
    private boolean requireVehicleVerification;

    static final int MAX_DAYS_AHEAD = 30;

    @Value("${aviro.ride.first-departure:06:00}")
    private LocalTime firstDeparture;

    @Value("${aviro.ride.last-departure:20:00}")
    private LocalTime lastDeparture;

    private static final Map<RideStatus, Set<RideStatus>> ALLOWED_MOVES =
            Map.of(
                    RideStatus.PENDING,
                            Set.of(
                                    RideStatus.ACTIVE,
                                    RideStatus.IN_PROGRESS,
                                    RideStatus.COMPLETED,
                                    RideStatus.CANCELLED),
                    RideStatus.ACTIVE,
                            Set.of(
                                    RideStatus.IN_PROGRESS,
                                    RideStatus.COMPLETED,
                                    RideStatus.CANCELLED),
                    RideStatus.IN_PROGRESS, Set.of(RideStatus.COMPLETED));

    @Override
    @Transactional
    public ApiResponse<RideResponse> createRide(String email, RideRequest.Create request) {
        User driver = getUser(email);

        if (driver.getGuidelinesAcceptedAt() == null) {
            throw new AviroException(
                    "Please accept the community guidelines first. Open the app and tick them to"
                            + " continue.");
        }

        if (!Boolean.TRUE.equals(driver.getIsCollegeVerified())) {
            throw new AviroException(
                    "⚠️ College ID not verified! Please upload your college ID in Profile before"
                            + " posting a ride.");
        }

        Vehicle vehicle = vehicleRepository.findByUserId(driver.getId()).orElse(null);
        if (vehicle == null) {
            throw new AviroException(
                    "🚗 No vehicle registered! Please add your vehicle in Profile before posting a"
                            + " ride.");
        }

        if (requireVehicleVerification && !vehicle.hasBothPhotos()) {
            throw new AviroException(
                    "🚗 Upload your number plate and driving licence photos in Profile to start"
                            + " offering rides.");
        }
        if (requireVehicleVerification && !Boolean.TRUE.equals(vehicle.getIsVerified())) {
            throw new AviroException(
                    "🚗 Vehicle not verified yet! An admin is checking your photos.");
        }

        if (request.getDepartureTime() == null
                || request.getDepartureTime().isBefore(LocalDateTime.now().plusMinutes(15))) {
            throw new AviroException("⏰ Departure time must be at least 15 minutes from now.");
        }
        if (request.getDepartureTime().isAfter(LocalDateTime.now().plusDays(MAX_DAYS_AHEAD))) {
            throw new AviroException(
                    "📅 Rides can be posted up to " + MAX_DAYS_AHEAD + " days ahead.");
        }

        LocalTime leaves = request.getDepartureTime().toLocalTime();
        if (leaves.isBefore(firstDeparture) || leaves.isAfter(lastDeparture)) {
            throw new AviroException(
                    "🌙 Rides can leave only between "
                            + hhmm(firstDeparture)
                            + " and "
                            + hhmm(lastDeparture)
                            + ". Please pick a time in college hours.");
        }

        if (vehicle.getVehicleType() == null || !vehicle.getVehicleType().supported()) {
            throw new AviroException(
                    "🚗 AVIRO supports bikes, scooties and cars. Update your vehicle in Profile.");
        }
        int maxRiders = vehicle.getVehicleType().maxRiders();
        if (request.getTotalSeats() == null
                || request.getTotalSeats() < 1
                || request.getTotalSeats() > maxRiders) {
            throw new AviroException(
                    maxRiders == 1
                            ? "🪑 A "
                                    + vehicle.getVehicleType().name().toLowerCase()
                                    + " can take 1 rider."
                            : "🪑 Seats must be between 1 and " + maxRiders + ".");
        }

        if (request.getPricePerSeat() == null
                || request.getPricePerSeat() < 1
                || request.getPricePerSeat() > maxPricePerSeat) {
            throw new AviroException(
                    "💰 Each share must be between ₹1 and ₹"
                            + Math.round(maxPricePerSeat)
                            + ". AVIRO is for sharing fuel costs, not for profit.");
        }

        if (request.getFromLocation() != null
                && request.getToLocation() != null
                && request.getFromLocation()
                        .trim()
                        .equalsIgnoreCase(request.getToLocation().trim())) {
            throw new AviroException("📍 Pickup and drop locations cannot be the same.");
        }

        LocalDateTime now = LocalDateTime.now();
        List<Ride> existingRides =
                rideRepository.findByDriverAndStatus(driver.getId(), RideStatus.PENDING);
        boolean duplicate =
                existingRides.stream()
                        .anyMatch(
                                r ->
                                        r.getDepartureTime() != null
                                                && r.getDepartureTime().isAfter(now)
                                                && r.getFromLocation()
                                                        .equalsIgnoreCase(
                                                                request.getFromLocation().trim())
                                                && r.getToLocation()
                                                        .equalsIgnoreCase(
                                                                request.getToLocation().trim()));
        if (duplicate) {
            throw new AviroException("🔁 You already have an active ride on this route.");
        }

        Ride ride =
                Ride.builder()
                        .driver(driver)
                        .fromLocation(request.getFromLocation().trim())
                        .toLocation(request.getToLocation().trim())
                        .departureTime(request.getDepartureTime())
                        .availableSeats(request.getTotalSeats())
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
        rideRequestService.notifyMatches(ride);
        log.info(
                "✅ Ride created: driver={} route={}→{}",
                email,
                ride.getFromLocation(),
                ride.getToLocation());
        return ApiResponse.success("Ride posted successfully! 🚀", toResponse(ride, vehicle));
    }

    @Override
    public ApiResponse<List<RideResponse>> searchRides(RideRequest.Search request) {
        int seatsNeeded = request.getSeatsNeeded() != null ? request.getSeatsNeeded() : 1;

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from =
                request.getDepartureTime() != null
                                && request.getDepartureTime().minusHours(2).isAfter(now)
                        ? request.getDepartureTime().minusHours(2)
                        : now;
        LocalDateTime to =
                request.getDepartureTime() != null
                        ? request.getDepartureTime().plusHours(2)
                        : LocalDateTime.now().plusDays(7);

        List<Ride> matched =
                rideRepository.searchRides(
                        seatsNeeded,
                        from,
                        to,
                        Boolean.TRUE.equals(request.getWomenOnly()),
                        request.getDriverGender() == null ? null : request.getDriverGender().name(),
                        request.getMaxPrice(),
                        squash(request.getFromLocation()),
                        squash(request.getToLocation()),
                        MAX_SEARCH_RESULTS);
        List<RideResponse> result = toResponses(matched);

        return ApiResponse.success(result);
    }

    @Override
    public ApiResponse<RideResponse> getRideById(Long rideId) {
        Ride ride =
                rideRepository
                        .findById(rideId)
                        .orElseThrow(() -> new AviroException("Ride not found"));
        return ApiResponse.success(toResponse(ride, getVehicleForDriver(ride.getDriver().getId())));
    }

    @Override
    public ApiResponse<List<RideResponse>> getMyRides(String email) {
        User driver = getUser(email);
        Vehicle vehicle = vehicleRepository.findByUserId(driver.getId()).orElse(null);
        List<Ride> rides =
                rideRepository.findTop100ByDriverIdOrderByDepartureTimeDesc(driver.getId());
        return ApiResponse.success(
                rides.stream().map(r -> toResponse(r, vehicle)).collect(Collectors.toList()));
    }

    @Override
    @Transactional
    public ApiResponse<RideResponse> updateRideStatus(String email, Long rideId, String status) {
        User driver = getUser(email);
        Ride ride =
                rideRepository
                        .findById(rideId)
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
            throw new AviroException(
                    "A "
                            + ride.getStatus().name().toLowerCase()
                            + " ride can't be marked "
                            + newStatus.name().toLowerCase());
        }

        if (newStatus == RideStatus.CANCELLED) {
            cancelRide(email, rideId);
            return ApiResponse.success(
                    "Ride status updated", toResponse(ride, getVehicleForDriver(driver.getId())));
        }

        ride.setStatus(newStatus);
        rideRepository.save(ride);
        return ApiResponse.success(
                "Ride status updated", toResponse(ride, getVehicleForDriver(driver.getId())));
    }

    @Override
    @Transactional
    public ApiResponse<String> cancelRide(String email, Long rideId) {
        User driver = getUser(email);
        Ride ride =
                rideRepository
                        .findById(rideId)
                        .orElseThrow(() -> new AviroException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new AviroException("🚫 You are not authorized to cancel this ride.");
        }

        if (ride.getStatus() == RideStatus.CANCELLED || ride.getStatus() == RideStatus.COMPLETED) {
            throw new AviroException(
                    "This ride is already " + ride.getStatus().name().toLowerCase());
        }

        long confirmed = bookingRepository.countByRideIdAndStatus(rideId, BookingStatus.CONFIRMED);
        if (confirmed > 0) {
            throw new AviroException(
                    "❌ Cannot cancel — " + confirmed + " confirmed booking(s) exist.");
        }

        ride.setStatus(RideStatus.CANCELLED);
        rideRepository.save(ride);

        for (Booking booking : bookingRepository.findActiveBookingsForRide(rideId)) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setTripStage(null);
            bookingRepository.save(booking);
            try {
                notificationService.send(
                        booking.getRider().getId(),
                        "Ride Cancelled",
                        driver.getFullName()
                                + " cancelled the ride from "
                                + ride.getFromLocation()
                                + " to "
                                + ride.getToLocation()
                                + ". Try finding another ride!",
                        "BOOKING_CANCELLED",
                        String.valueOf(booking.getId()));
            } catch (Exception e) {
                log.warn("In-app notification failed: {}", e.getMessage());
            }
        }
        log.info("Ride cancelled: rideId={} driver={}", rideId, email);
        return ApiResponse.success("Ride cancelled successfully", null);
    }

    @Override
    public ApiResponse<List<RideResponse>> getNearbyRides(Double lat, Double lng, Integer seats) {
        List<Ride> rides =
                rideRepository.findNearbyRides(
                        lat, lng, 5.0, seats != null ? seats : 1, LocalDateTime.now());
        return ApiResponse.success(toResponses(rides));
    }

    @Override
    public ApiResponse<Double> estimateFare(String from, String to, Integer seats) {
        double estimatedKm = 7.0;
        double baseFare = estimatedKm * 15;
        double perSeatFare = baseFare / (seats != null ? seats : 1);
        log.info("Fare estimate: from={} to={} seats={} fare=₹{}", from, to, seats, perSeatFare);
        return ApiResponse.success("Estimated fare per seat (shared)", perSeatFare);
    }

    private Vehicle getVehicleForDriver(Long driverId) {
        return vehicleRepository.findByUserId(driverId).orElse(null);
    }

    private List<RideResponse> toResponses(List<Ride> rides) {
        Set<Long> driverIds =
                rides.stream().map(r -> r.getDriver().getId()).collect(Collectors.toSet());
        Map<Long, Vehicle> vehicles =
                driverIds.isEmpty()
                        ? Map.of()
                        : vehicleRepository.findByUserIdIn(driverIds).stream()
                                .collect(
                                        Collectors.toMap(
                                                v -> v.getUser().getId(), v -> v, (a, b) -> a));
        return rides.stream()
                .map(r -> toResponse(r, vehicles.get(r.getDriver().getId())))
                .collect(Collectors.toList());
    }

    private RideResponse toResponse(Ride ride, Vehicle vehicle) {
        User driver = ride.getDriver();

        String genderLabel =
                switch (driver.getGender()) {
                    case MALE -> "Male driver";
                    case FEMALE -> "Female driver";
                    default -> "Driver";
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
                .driver(
                        RideResponse.DriverInfo.builder()
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
                                .vehicleType(
                                        vehicle != null && vehicle.getVehicleType() != null
                                                ? vehicle.getVehicleType().name()
                                                : null)
                                .vehicleModel(vehicle != null ? vehicle.getModel() : null)
                                .vehicleColor(vehicle != null ? vehicle.getColor() : null)
                                .vehicleRegistrationNumber(
                                        vehicle != null ? vehicle.getRegistrationNumber() : null)
                                .build())
                .build();
    }

    private static String squash(String s) {
        return s == null ? "" : s.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private static String hhmm(LocalTime t) {
        return t.format(
                java.time.format.DateTimeFormatter.ofPattern("h:mm a", java.util.Locale.ENGLISH));
    }

    private User getUser(String email) {
        return userRepository
                .findByEmail(email)
                .orElseThrow(() -> new AviroException("User not found"));
    }
}
