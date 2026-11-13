package com.aviro.service;

import com.aviro.dto.response.ApiResponse;
import com.aviro.entity.Booking;
import com.aviro.entity.Ride;
import com.aviro.entity.User;
import com.aviro.enums.BookingStatus;
import com.aviro.enums.RideStatus;
import com.aviro.exception.AviroException;
import com.aviro.repository.BookingRepository;
import com.aviro.repository.NotificationRepository;
import com.aviro.repository.PushSubscriptionRepository;
import com.aviro.repository.RideRepository;
import com.aviro.repository.UserRepository;
import com.aviro.repository.VehicleRepository;
import com.aviro.security.AuthUserCache;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountDeletionService {

    private static final String UPLOAD_DIR =
            System.getProperty("user.dir") + "/uploads/college-ids/";
    private static final Set<BookingStatus> OPEN_BOOKINGS =
            EnumSet.of(BookingStatus.REQUESTED, BookingStatus.CONFIRMED);
    private static final Set<RideStatus> OPEN_RIDES =
            EnumSet.of(RideStatus.PENDING, RideStatus.ACTIVE);

    private final UserRepository userRepository;
    private final RideRepository rideRepository;
    private final BookingRepository bookingRepository;
    private final VehicleRepository vehicleRepository;
    private final NotificationRepository notificationRepository;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final BookingService bookingService;
    private final PasswordEncoder passwordEncoder;
    private final AuthUserCache authUserCache;
    private final com.aviro.security.AttemptCounter attempts;

    private static final java.time.Duration DELETE_LOCK_WINDOW = java.time.Duration.ofMinutes(15);
    private static final int MAX_WRONG_PASSWORDS = 5;

    @Transactional
    public ApiResponse<String> deleteAccount(String email, String password) {
        User user =
                userRepository
                        .findByEmail(email)
                        .orElseThrow(() -> new AviroException("User not found"));

        String failKey = "aviro:delete-fail:" + user.getId();
        if (attempts.current(failKey, DELETE_LOCK_WINDOW) >= MAX_WRONG_PASSWORDS) {
            throw new AviroException("Too many wrong passwords. Please try again in 15 minutes.");
        }
        if (password == null || !passwordEncoder.matches(password, user.getPassword())) {
            attempts.increment(failKey, DELETE_LOCK_WINDOW);
            throw new AviroException("Incorrect password");
        }

        List<Ride> myRides = rideRepository.findByDriverId(user.getId());
        List<Booking> myBookings = bookingRepository.findByRiderId(user.getId());

        boolean rideInProgress =
                myRides.stream().anyMatch(r -> r.getStatus() == RideStatus.IN_PROGRESS)
                        || myBookings.stream()
                                .anyMatch(
                                        b ->
                                                OPEN_BOOKINGS.contains(b.getStatus())
                                                        && b.getRide().getStatus()
                                                                == RideStatus.IN_PROGRESS);
        if (rideInProgress) {
            throw new AviroException(
                    "You have a ride in progress. Please finish it before deleting your account.");
        }

        for (Booking booking : myBookings) {
            if (OPEN_BOOKINGS.contains(booking.getStatus())) {
                bookingService.cancelBooking(email, booking.getId());
            }
        }

        for (Ride ride : myRides) {
            if (!OPEN_RIDES.contains(ride.getStatus())) continue;
            for (Booking booking : bookingRepository.findByRideId(ride.getId())) {
                if (OPEN_BOOKINGS.contains(booking.getStatus())) {
                    bookingService.cancelBooking(email, booking.getId());
                }
            }
            ride.setStatus(RideStatus.CANCELLED);
            rideRepository.save(ride);
        }

        notificationRepository.deleteByUserId(user.getId());
        pushSubscriptionRepository.deleteByUserId(user.getId());
        vehicleRepository.findByUserId(user.getId()).ifPresent(vehicleRepository::delete);
        deleteCollegeIdImage(user.getCollegeIdPicUrl());

        user.setFullName("Deleted User");
        authUserCache.evict(user.getEmail());
        user.setEmail("deleted-" + user.getId() + "-" + UUID.randomUUID() + "@deleted.aviro");
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setPhone(null);
        user.setUpiId(null);
        user.setCollegeIdNumber(null);
        user.setCollegeIdPicUrl(null);
        user.setProfilePicUrl(null);
        user.setDepartment(null);
        user.setYearOfStudy(null);
        user.setLocality(null);
        user.setCity(null);
        user.setHomeLat(null);
        user.setHomeLng(null);
        user.getEmergencyContacts().clear();
        user.getRideBuddies().clear();
        user.setIsVerified(false);
        user.setIsCollegeVerified(false);
        user.setIsActive(false);
        userRepository.save(user);

        log.info("Account deleted: userId={}", user.getId());
        return ApiResponse.success("Your account has been deleted.", null);
    }

    private void deleteCollegeIdImage(String imageUrl) {
        if (imageUrl == null || !imageUrl.contains("/")) return;
        String filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
        if (filename.contains("..")) return;
        try {
            Path path = Paths.get(UPLOAD_DIR).resolve(filename).normalize();
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Could not delete college ID image {}: {}", filename, e.getMessage());
        }
    }
}
