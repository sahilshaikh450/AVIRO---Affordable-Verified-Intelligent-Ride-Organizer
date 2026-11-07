package com.aviro.service.impl;

import com.aviro.enums.VehicleType;

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
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final RideRepository rideRepository;
    private final BookingRepository bookingRepository;

    // Tells the app whether drivers must verify their vehicle before posting rides
    @org.springframework.beans.factory.annotation.Value("${aviro.vehicle.require-verification:false}")
    private boolean requireVehicleVerification;

    // Indian plates after removing spaces/dashes: MH12AB1234, DL3CAF1234, MH121234 or BH series 22BH1234AA
    private static final Pattern INDIAN_PLATE =
            Pattern.compile("^([A-Z]{2}\\d{1,2}[A-Z]{0,3}\\d{1,4}|\\d{2}BH\\d{4}[A-Z]{1,2})$");

    private static final Pattern UPI_ID = Pattern.compile("^[a-z0-9._-]{2,64}@[a-z][a-z0-9]{1,30}$");

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
        if (request.getUpiId() != null) user.setUpiId(normalizeUpiId(request.getUpiId()));
        if (request.getLocality() != null) user.setLocality(request.getLocality());
        if (request.getHomeLat() != null) user.setHomeLat(request.getHomeLat());
        if (request.getHomeLng() != null) user.setHomeLng(request.getHomeLng());
        if (request.getDepartment() != null) user.setDepartment(request.getDepartment());
        if (request.getYearOfStudy() != null) user.setYearOfStudy(request.getYearOfStudy());
        if (request.getWomenOnlyMode() != null) user.setWomenOnlyMode(request.getWomenOnlyMode());
        // Emergency contacts are changed only through /safety/emergency-contacts, which checks them
        userRepository.save(user);
        return ApiResponse.success("Profile updated successfully", toResponse(user));
    }

    @Override
    @Transactional
    public ApiResponse<VehicleResponse> addVehicle(String email, VehicleRequest request) {
        User user = getUser(email);
        // "mh 12-ab 1234" and "MH12AB1234" are the same plate
        String registration = request.getRegistrationNumber().toUpperCase().replaceAll("[\\s-]", "");
        if (!INDIAN_PLATE.matcher(registration).matches()) {
            throw new AviroException("Enter a valid number plate, like MH12AB1234 or 22BH1234AA");
        }
        VehicleType type = request.getVehicleType();
        if (type == null || !type.supported()) {
            throw new AviroException("AVIRO supports bikes, scooties and cars");
        }
        if (request.getTotalSeats() > type.maxRiders()) {
            throw new AviroException(type == VehicleType.CAR
                    ? "A car can take up to 4 riders"
                    : "A " + type.name().toLowerCase() + " can take 1 rider");
        }
        // A user has one vehicle: adding again replaces its details
        Vehicle vehicle = vehicleRepository.findByUserId(user.getId())
                .orElseGet(() -> Vehicle.builder().user(user).build());
        boolean sameAsBefore = registration.equals(vehicle.getRegistrationNumber());
        if (!sameAsBefore && vehicleRepository.existsByRegistrationNumber(registration)) {
            throw new AviroException("Vehicle with this registration number already exists");
        }
        boolean updating = vehicle.getId() != null;
        // A new vehicle, or a different plate or type, has to be checked by an admin again
        boolean needsReview = !updating || !sameAsBefore || vehicle.getVehicleType() != request.getVehicleType();
        vehicle.setVehicleType(request.getVehicleType());
        vehicle.setRegistrationNumber(registration);
        vehicle.setMake(request.getMake());
        vehicle.setModel(request.getModel());
        vehicle.setColor(request.getColor());
        vehicle.setYear(request.getYear());
        vehicle.setTotalSeats(request.getTotalSeats());
        if (needsReview) vehicle.setIsVerified(false);
        vehicleRepository.save(vehicle);
        return ApiResponse.success(needsReview
                ? "Vehicle saved. Upload the number plate and driving licence photos for verification."
                : "Vehicle updated!", toVehicleResponse(vehicle));
    }

    @Override
    @Transactional
    public VehiclePhotoResult setVehiclePhoto(String email, String kind, String url) {
        User user = getUser(email);
        Vehicle vehicle = vehicleRepository.findByUserId(user.getId())
                .orElseThrow(() -> new AviroException("Add your vehicle details first"));
        String previous;
        if ("plate".equals(kind)) {
            previous = vehicle.getPlatePhotoUrl();
            vehicle.setPlatePhotoUrl(url);
        } else {
            previous = vehicle.getLicencePhotoUrl();
            vehicle.setLicencePhotoUrl(url);
        }
        vehicle.setIsVerified(false); // a new photo needs a new look
        vehicleRepository.save(vehicle);
        return new VehiclePhotoResult(toVehicleResponse(vehicle), previous);
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

    // Blank clears it; otherwise it must look like name@bank
    private static String normalizeUpiId(String raw) {
        String upi = raw.trim().toLowerCase();
        if (upi.isEmpty()) return null;
        if (!UPI_ID.matcher(upi).matches()) {
            throw new AviroException("Enter a valid UPI ID, like yourname@okaxis");
        }
        return upi;
    }

    private UserResponse toResponse(User user) {
        VehicleResponse vehicleResponse = vehicleRepository.findByUserId(user.getId())
                .map(this::toVehicleResponse).orElse(null);
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .upiId(user.getUpiId())
                .gender(user.getGender())
                .role(user.getRole())
                .collegeName(user.getCollegeName())
                .department(user.getDepartment())
                .yearOfStudy(user.getYearOfStudy())
                .locality(user.getLocality())
                .profilePicUrl(user.getProfilePicUrl())
                .collegeIdPicUrl(user.getCollegeIdPicUrl())
                .isVerified(user.getIsVerified())
                .isCollegeVerified(user.getIsCollegeVerified())
                .rating(user.getRating())
                .totalRides(user.getTotalRides())
                .aviroCredits(user.getAviroCredits())
                .co2Saved(user.getCo2Saved())
                .womenOnlyMode(user.getWomenOnlyMode())
                .createdAt(user.getCreatedAt())
                .vehicle(vehicleResponse)
                .vehicleVerificationRequired(requireVehicleVerification)
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
                .platePhotoUrl(v.getPlatePhotoUrl())
                .licencePhotoUrl(v.getLicencePhotoUrl())
                .build();
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AviroException("User not found"));
    }
}