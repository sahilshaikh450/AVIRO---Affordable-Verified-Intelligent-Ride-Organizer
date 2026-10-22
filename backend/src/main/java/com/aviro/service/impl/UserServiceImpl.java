package com.aviro.service.impl;

import com.aviro.dto.request.ProfileUpdateRequest;
import com.aviro.dto.request.VehicleRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.UserResponse;
import com.aviro.dto.response.VehicleResponse;
import com.aviro.entity.User;
import com.aviro.entity.Vehicle;
import com.aviro.exception.AviroException;
import com.aviro.repository.BookingRepository;
import com.aviro.repository.RideRepository;
import com.aviro.repository.UserRepository;
import com.aviro.repository.VehicleRepository;
import com.aviro.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final RideRepository rideRepository;
    private final BookingRepository bookingRepository;

    @Override
    public ApiResponse<UserResponse> getProfile(String email) {
        User user = getUser(email);
        return ApiResponse.success(toResponse(user));
    }

    @Override
    @Transactional
    public ApiResponse<UserResponse> updateProfile(String email, ProfileUpdateRequest request) {
        User user = getUser(email);
        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getLocality() != null) user.setLocality(request.getLocality());
        if (request.getHomeLat() != null) user.setHomeLat(request.getHomeLat());
        if (request.getHomeLng() != null) user.setHomeLng(request.getHomeLng());
        if (request.getDepartment() != null) user.setDepartment(request.getDepartment());
        if (request.getYearOfStudy() != null) user.setYearOfStudy(request.getYearOfStudy());
        if (request.getWomenOnlyMode() != null) user.setWomenOnlyMode(request.getWomenOnlyMode());
        if (request.getEmergencyContacts() != null) user.setEmergencyContacts(request.getEmergencyContacts());
        userRepository.save(user);
        return ApiResponse.success("Profile updated successfully", toResponse(user));
    }

    @Override
    @Transactional
    public ApiResponse<VehicleResponse> addVehicle(String email, VehicleRequest request) {
        User user = getUser(email);
        if (vehicleRepository.existsByRegistrationNumber(request.getRegistrationNumber())) {
            throw new AviroException("Vehicle with this registration number already exists");
        }
        Vehicle vehicle = Vehicle.builder()
                .user(user)
                .vehicleType(request.getVehicleType())
                .registrationNumber(request.getRegistrationNumber().toUpperCase())
                .make(request.getMake())
                .model(request.getModel())
                .color(request.getColor())
                .year(request.getYear())
                .totalSeats(request.getTotalSeats())
                .isVerified(true) // ✅ Auto verify on add
                .build();
        vehicleRepository.save(vehicle);
        return ApiResponse.success("Vehicle added & verified successfully!", toVehicleResponse(vehicle));
    }

    @Override
    public ApiResponse<VehicleResponse> getVehicle(String email) {
        User user = getUser(email);
        Vehicle vehicle = vehicleRepository.findByUserId(user.getId())
                .orElseThrow(() -> new AviroException("No vehicle registered"));
        return ApiResponse.success(toVehicleResponse(vehicle));
    }

    @Override
    @Transactional
    public ApiResponse<String> addRideBuddy(String email, Long buddyId) {
        User user = getUser(email);
        User buddy = userRepository.findById(buddyId)
                .orElseThrow(() -> new AviroException("User not found"));
        if (user.getRideBuddies().contains(buddy)) {
            throw new AviroException("Already a ride buddy");
        }
        user.getRideBuddies().add(buddy);
        userRepository.save(user);
        return ApiResponse.success("Ride buddy added: " + buddy.getFullName(), null);
    }

    @Override
    @Transactional
    public ApiResponse<String> removeRideBuddy(String email, Long buddyId) {
        User user = getUser(email);
        user.getRideBuddies().removeIf(b -> b.getId().equals(buddyId));
        userRepository.save(user);
        return ApiResponse.success("Ride buddy removed", null);
    }

    @Override
    public ApiResponse<Object> getDashboardStats(String email) {
        User user = getUser(email);
        Long completedRides = bookingRepository.countCompletedByRider(user.getId());
        Double totalSpent = bookingRepository.totalSpentByRider(user.getId());
        Long ridesOffered = rideRepository.countCompletedByDriver(user.getId());

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRidesBooked", completedRides != null ? completedRides : 0);
        stats.put("totalRidesOffered", ridesOffered != null ? ridesOffered : 0);
        stats.put("totalSpent", totalSpent != null ? totalSpent : 0.0);
        stats.put("aviroCredits", user.getAviroCredits());
        stats.put("co2Saved", user.getCo2Saved());
        stats.put("rating", user.getRating());
        stats.put("rideBuddiesCount", user.getRideBuddies().size());
        stats.put("isCollegeVerified", user.getIsCollegeVerified());
        return ApiResponse.success(stats);
    }

    private UserResponse toResponse(User user) {
        VehicleResponse vehicleResponse = vehicleRepository.findByUserId(user.getId())
                .map(this::toVehicleResponse).orElse(null);
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .gender(user.getGender())
                .role(user.getRole())
                .collegeName(user.getCollegeName())
                .department(user.getDepartment())
                .yearOfStudy(user.getYearOfStudy())
                .locality(user.getLocality())
                .profilePicUrl(user.getProfilePicUrl())
                .isVerified(user.getIsVerified())
                .isCollegeVerified(user.getIsCollegeVerified())
                .rating(user.getRating())
                .totalRides(user.getTotalRides())
                .aviroCredits(user.getAviroCredits())
                .co2Saved(user.getCo2Saved())
                .womenOnlyMode(user.getWomenOnlyMode())
                .createdAt(user.getCreatedAt())
                .vehicle(vehicleResponse)
                .build();
    }

    private VehicleResponse toVehicleResponse(Vehicle v) {
        return VehicleResponse.builder()
                .id(v.getId())
                .vehicleType(v.getVehicleType())
                .registrationNumber(v.getRegistrationNumber())
                .make(v.getMake())
                .model(v.getModel())
                .color(v.getColor())
                .year(v.getYear())
                .totalSeats(v.getTotalSeats())
                .isVerified(v.getIsVerified())
                .build();
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AviroException("User not found"));
    }
}