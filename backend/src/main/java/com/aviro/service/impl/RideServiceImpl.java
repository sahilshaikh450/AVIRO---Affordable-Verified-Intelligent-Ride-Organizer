package com.aviro.service.impl;

import com.aviro.dto.request.RideRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.RideResponse;
import com.aviro.entity.Ride;
import com.aviro.entity.User;
import com.aviro.entity.Vehicle;
import com.aviro.enums.RideStatus;
import com.aviro.exception.AviroException;
import com.aviro.repository.RideRepository;
import com.aviro.repository.UserRepository;
import com.aviro.service.RideService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RideServiceImpl implements RideService {

    private final RideRepository rideRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public ApiResponse<RideResponse> createRide(String email, RideRequest.Create request) {
        User driver = getUser(email);

        // 🔒 College ID must be verified
        if (!Boolean.TRUE.equals(driver.getIsCollegeVerified())) {
            throw new AviroException("Please verify your college ID before offering rides. Go to Profile → College ID Verification.");
        }

        // 🔒 Vehicle must exist
        if (driver.getVehicle() == null) {
            throw new AviroException("Please add a vehicle before offering a ride");
        }

        // 🔒 Vehicle must be verified by admin
        if (!Boolean.TRUE.equals(driver.getVehicle().getIsVerified())) {
            throw new AviroException("Your vehicle is pending verification by admin. You cannot offer rides until your vehicle is verified.");
        }

        Ride ride = Ride.builder()
                .driver(driver)
                .fromLocation(request.getFromLocation())
                .fromLat(request.getFromLat())
                .fromLng(request.getFromLng())
                .toLocation(request.getToLocation())
                .toLat(request.getToLat())
                .toLng(request.getToLng())
                .departureTime(request.getDepartureTime())
                .totalSeats(request.getTotalSeats())
                .availableSeats(request.getTotalSeats())
                .pricePerSeat(request.getPricePerSeat())
                .isRecurring(request.getIsRecurring())
                .recurringDays(request.getRecurringDays())
                .womenOnly(request.getWomenOnly())
                .allowedGender(request.getAllowedGender())
                .notes(request.getNotes())
                .status(RideStatus.PENDING)
                .build();

        rideRepository.save(ride);
        log.info("Ride created by {} from {} to {}", email, request.getFromLocation(), request.getToLocation());

        return ApiResponse.success("Ride posted successfully!", toResponse(ride));
    }

    @Override
    public ApiResponse<List<RideResponse>> searchRides(RideRequest.Search request) {
        LocalDateTime from = request.getDepartureTime() != null
                ? request.getDepartureTime().minusHours(1)
                : LocalDateTime.now();
        LocalDateTime to = from.plusHours(3);

        List<Ride> rides = rideRepository.searchRides(
                request.getSeatsNeeded(),
                from,
                to,
                request.getWomenOnly() != null && request.getWomenOnly(),
                request.getDriverGender()
        );

        if (request.getMaxPrice() != null) {
            rides = rides.stream()
                    .filter(r -> r.getPricePerSeat() <= request.getMaxPrice())
                    .collect(Collectors.toList());
        }

        return ApiResponse.success(rides.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @Override
    public ApiResponse<RideResponse> getRideById(Long rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new AviroException("Ride not found"));
        return ApiResponse.success(toResponse(ride));
    }

    @Override
    public ApiResponse<List<RideResponse>> getMyRides(String email) {
        User user = getUser(email);
        List<Ride> rides = rideRepository.findByDriverId(user.getId());
        return ApiResponse.success(rides.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @Override
    @Transactional
    public ApiResponse<RideResponse> updateRideStatus(String email, Long rideId, String status) {
        User user = getUser(email);
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new AviroException("Ride not found"));

        if (!ride.getDriver().getId().equals(user.getId())) {
            throw new AviroException("You can only update your own rides");
        }

        ride.setStatus(RideStatus.valueOf(status.toUpperCase()));
        rideRepository.save(ride);
        return ApiResponse.success("Ride status updated", toResponse(ride));
    }

    @Override
    @Transactional
    public ApiResponse<String> cancelRide(String email, Long rideId) {
        User user = getUser(email);
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new AviroException("Ride not found"));

        if (!ride.getDriver().getId().equals(user.getId())) {
            throw new AviroException("You can only cancel your own rides");
        }

        ride.setStatus(RideStatus.CANCELLED);
        rideRepository.save(ride);
        return ApiResponse.success("Ride cancelled successfully", null);
    }

    @Override
    public ApiResponse<List<RideResponse>> getNearbyRides(Double lat, Double lng, Integer seats) {
        List<Ride> rides = rideRepository.findNearbyRides(lat, lng, 5.0, seats, LocalDateTime.now());
        return ApiResponse.success(rides.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @Override
    public ApiResponse<Double> estimateFare(String from, String to, Integer seats) {
        double baseFare = 15.0 + (Math.random() * 20 + 10);
        double estimated = Math.round(baseFare * seats * 10.0) / 10.0;
        return ApiResponse.success(estimated);
    }

    public RideResponse toResponse(Ride ride) {
        User driver = ride.getDriver();
        Vehicle vehicle = driver.getVehicle();

        String genderLabel = switch (driver.getGender()) {
            case MALE   -> "Male driver";
            case FEMALE -> "Female driver";
            default     -> "Driver";
        };

        return RideResponse.builder()
                .id(ride.getId())
                .driver(RideResponse.DriverInfo.builder()
                        .id(driver.getId())
                        .fullName(driver.getFullName())
                        .gender(driver.getGender())
                        .genderLabel(genderLabel)
                        .rating(driver.getRating())
                        .totalRides(driver.getTotalRides())
                        .collegeName(driver.getCollegeName())
                        .profilePicUrl(driver.getProfilePicUrl())
                        .isCollegeVerified(driver.getIsCollegeVerified())
                        .vehicleType(vehicle != null ? vehicle.getVehicleType() : null)
                        .vehicleModel(vehicle != null ? vehicle.getModel() : null)
                        .vehicleColor(vehicle != null ? vehicle.getColor() : null)
                        .build())
                .fromLocation(ride.getFromLocation())
                .fromLat(ride.getFromLat())
                .fromLng(ride.getFromLng())
                .toLocation(ride.getToLocation())
                .toLat(ride.getToLat())
                .toLng(ride.getToLng())
                .departureTime(ride.getDepartureTime())
                .totalSeats(ride.getTotalSeats())
                .availableSeats(ride.getAvailableSeats())
                .pricePerSeat(ride.getPricePerSeat())
                .status(ride.getStatus())
                .isRecurring(ride.getIsRecurring())
                .recurringDays(ride.getRecurringDays())
                .womenOnly(ride.getWomenOnly())
                .allowedGender(ride.getAllowedGender())
                .notes(ride.getNotes())
                .createdAt(ride.getCreatedAt())
                .build();
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AviroException("User not found"));
    }
}