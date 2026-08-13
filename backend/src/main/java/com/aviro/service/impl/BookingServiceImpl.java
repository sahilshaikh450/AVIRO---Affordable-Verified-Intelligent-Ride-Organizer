package com.aviro.service.impl;

import com.aviro.dto.request.BookingRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.BookingResponse;
import com.aviro.dto.response.RideResponse;
import com.aviro.entity.Booking;
import com.aviro.entity.Ride;
import com.aviro.entity.User;
import com.aviro.entity.Vehicle;
import com.aviro.enums.BookingStatus;
import com.aviro.enums.PaymentStatus;
import com.aviro.exception.AviroException;
import com.aviro.repository.BookingRepository;
import com.aviro.repository.RideRepository;
import com.aviro.repository.UserRepository;
import com.aviro.service.BookingService;
import com.aviro.service.EmailService;
import com.aviro.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public ApiResponse<BookingResponse> createBooking(String email, BookingRequest.Create request) {
        User rider = getUser(email);
        if (!Boolean.TRUE.equals(rider.getIsCollegeVerified())) {
            throw new AviroException("Please verify your college ID before booking rides. Go to Profile → College ID Verification.");
        }
        Ride ride = rideRepository.findById(request.getRideId())
                .orElseThrow(() -> new AviroException("Ride not found"));

        if (ride.getDriver().getId().equals(rider.getId())) {
            throw new AviroException("You cannot book your own ride");
        }
        if (ride.getAvailableSeats() < request.getSeatsBooked()) {
            throw new AviroException("Not enough seats available");
        }
        if (bookingRepository.findByRideIdAndRiderId(ride.getId(), rider.getId()).isPresent()) {
            throw new AviroException("You have already booked this ride");
        }
        if (ride.getWomenOnly() && rider.getGender() != com.aviro.enums.Gender.FEMALE) {
            throw new AviroException("This is a women-only ride");
        }

        double total = ride.getPricePerSeat() * request.getSeatsBooked();

        Booking booking = Booking.builder()
                .ride(ride)
                .rider(rider)
                .seatsBooked(request.getSeatsBooked())
                .totalAmount(total)
                .pickupPoint(request.getPickupPoint())
                .pickupLat(request.getPickupLat())
                .pickupLng(request.getPickupLng())
                .status(BookingStatus.REQUESTED)
                .build();

        bookingRepository.save(booking);

        ride.setAvailableSeats(ride.getAvailableSeats() - request.getSeatsBooked());
        rideRepository.save(ride);

        try {
            emailService.sendRideRequestNotification(
                    ride.getDriver().getEmail(),
                    ride.getDriver().getFullName(),
                    rider.getFullName()
            );
        } catch (Exception e) {
            log.warn("Email notification failed: {}", e.getMessage());
        }

        try {
            notificationService.send(
                    ride.getDriver().getId(),
                    "New Ride Request! 🔔",
                    rider.getFullName() + " wants to book " + request.getSeatsBooked() +
                            " seat(s) on your ride to " + ride.getToLocation(),
                    "BOOKING_REQUEST",
                    String.valueOf(booking.getId())
            );
        } catch (Exception e) {
            log.warn("In-app notification failed: {}", e.getMessage());
        }

        log.info("Booking created: rider={} ride={}", email, ride.getId());
        return ApiResponse.success("Booking request sent!", toResponse(booking));
    }

    @Override
    public ApiResponse<List<BookingResponse>> getMyBookings(String email) {
        User rider = getUser(email);
        List<Booking> bookings = bookingRepository.findByRiderId(rider.getId());
        return ApiResponse.success(bookings.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @Override
    public ApiResponse<BookingResponse> getBookingById(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AviroException("Booking not found"));
        return ApiResponse.success(toResponse(booking));
    }

    @Override
    @Transactional
    public ApiResponse<BookingResponse> updateBookingStatus(String email, Long bookingId, String status) {
        User actingUser = getUser(email);
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AviroException("Booking not found"));

        BookingStatus newStatus = BookingStatus.valueOf(status.toUpperCase());

        boolean isDriver = booking.getRide().getDriver().getId().equals(actingUser.getId());
        boolean isRider  = booking.getRider().getId().equals(actingUser.getId());

        if (newStatus == BookingStatus.COMPLETED) {
            if (!isDriver && !isRider) {
                throw new AviroException("You are not part of this booking");
            }
            if (booking.getStatus() != BookingStatus.CONFIRMED) {
                throw new AviroException("Only confirmed bookings can be marked as completed");
            }

            booking.setStatus(BookingStatus.COMPLETED);
            bookingRepository.save(booking);

            User driver = booking.getRide().getDriver();
            driver.setTotalRides((driver.getTotalRides() == null ? 0 : driver.getTotalRides()) + 1);
            userRepository.save(driver);

            User rider = booking.getRider();
            rider.setTotalRides((rider.getTotalRides() == null ? 0 : rider.getTotalRides()) + 1);
            userRepository.save(rider);

            try {
                Long notifyUserId = isDriver ? rider.getId() : driver.getId();
                String completedBy = isDriver ? driver.getFullName() : rider.getFullName();
                notificationService.send(
                        notifyUserId,
                        "Ride Completed! 🏁",
                        completedBy + " marked the ride from " + booking.getRide().getFromLocation() +
                                " to " + booking.getRide().getToLocation() + " as completed. Rate your experience!",
                        "RIDE_COMPLETED",
                        String.valueOf(booking.getId())
                );
            } catch (Exception e) {
                log.warn("In-app notification failed: {}", e.getMessage());
            }

            return ApiResponse.success("Ride marked as completed!", toResponse(booking));
        }

        if (!isDriver) {
            throw new AviroException("Only the driver can update booking status");
        }

        booking.setStatus(newStatus);
        bookingRepository.save(booking);

        if (newStatus == BookingStatus.CONFIRMED) {
            try {
                emailService.sendBookingConfirmation(
                        booking.getRider().getEmail(),
                        booking.getRider().getFullName(),
                        booking.getRide().getFromLocation() + " → " + booking.getRide().getToLocation()
                );
            } catch (Exception e) {
                log.warn("Email confirmation failed: {}", e.getMessage());
            }

            try {
                notificationService.send(
                        booking.getRider().getId(),
                        "Booking Confirmed! ✅",
                        actingUser.getFullName() + " accepted your ride request from " +
                                booking.getRide().getFromLocation() + " to " + booking.getRide().getToLocation(),
                        "BOOKING_ACCEPTED",
                        String.valueOf(booking.getId())
                );
            } catch (Exception e) {
                log.warn("In-app notification failed: {}", e.getMessage());
            }

        } else if (newStatus == BookingStatus.REJECTED) {
            try {
                notificationService.send(
                        booking.getRider().getId(),
                        "Booking Declined",
                        actingUser.getFullName() + " declined your ride request. Try finding another ride!",
                        "BOOKING_REJECTED",
                        String.valueOf(booking.getId())
                );
            } catch (Exception e) {
                log.warn("In-app notification failed: {}", e.getMessage());
            }
        }

        return ApiResponse.success("Booking status updated", toResponse(booking));
    }

    // ── PAYMENT: UPI ya Cash dono handle karta hai ──────────────────
    @Override
    @Transactional
    public ApiResponse<String> markAsPaid(String email, Long bookingId, String paymentReference) {
        User user = getUser(email);
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AviroException("Booking not found"));

        boolean isRider  = booking.getRider().getId().equals(user.getId());
        boolean isDriver = booking.getRide().getDriver().getId().equals(user.getId());

        User rider  = booking.getRider();
        User driver = booking.getRide().getDriver();

        // ── CASH: Driver confirms cash received ──
        if (isDriver) {
            if (!"CASH".equalsIgnoreCase(booking.getPaymentMethod())) {
                throw new AviroException("Only cash payment can be confirmed by driver");
            }
            booking.setPaymentStatus(PaymentStatus.COMPLETED);
            bookingRepository.save(booking);

            // Notify rider: driver confirmed cash payment
            try {
                notificationService.send(
                        rider.getId(),
                        "Cash Payment Confirmed! ✅",
                        driver.getFullName() + " confirmed that cash payment of ₹" +
                                booking.getTotalAmount() + " has been received. Transaction complete!",
                        "PAYMENT_RECEIVED",
                        String.valueOf(booking.getId())
                );
            } catch (Exception e) {
                log.warn("Notification failed: {}", e.getMessage());
            }

            // Notify driver: confirmation sent
            try {
                notificationService.send(
                        driver.getId(),
                        "Payment Recorded 💰",
                        "You confirmed cash payment of ₹" + booking.getTotalAmount() +
                                " from " + rider.getFullName() + ". Transaction complete!",
                        "PAYMENT_RECEIVED",
                        String.valueOf(booking.getId())
                );
            } catch (Exception e) {
                log.warn("Notification failed: {}", e.getMessage());
            }

            log.info("Cash payment confirmed by driver: booking={}", bookingId);
            return ApiResponse.success("Cash payment confirmed! Transaction complete.", null);
        }

        // ── UPI / CASH (rider side): rider marks as paid ──
        if (!isRider) {
            throw new AviroException("Only the rider or driver can update payment");
        }

        String method = paymentReference != null && paymentReference.startsWith("CASH") ? "CASH" : "UPI";
        booking.setPaymentMethod(method);
        booking.setPaymentReference(paymentReference);

        if ("CASH".equals(method)) {
            // Cash: rider says paid → set PENDING, driver needs to confirm
            booking.setPaymentStatus(PaymentStatus.PENDING);
            bookingRepository.save(booking);

            // Notify driver: rider claims cash paid, please confirm
            try {
                notificationService.send(
                        driver.getId(),
                        "Cash Payment Claim 💵",
                        rider.getFullName() + " says they paid ₹" + booking.getTotalAmount() +
                                " in cash. Please confirm if you received the cash!",
                        "PAYMENT_RECEIVED",
                        String.valueOf(booking.getId())
                );
            } catch (Exception e) {
                log.warn("Notification failed: {}", e.getMessage());
            }

            log.info("Cash payment claimed by rider: booking={}", bookingId);
            return ApiResponse.success("Cash payment submitted! Waiting for driver confirmation.", null);

        } else {
            // UPI: rider confirms → mark as COMPLETED directly
            booking.setPaymentStatus(PaymentStatus.COMPLETED);
            bookingRepository.save(booking);

            // Notify driver: UPI payment received
            try {
                notificationService.send(
                        driver.getId(),
                        "UPI Payment Received! 💰",
                        rider.getFullName() + " paid ₹" + booking.getTotalAmount() +
                                " via UPI for the ride to " + booking.getRide().getToLocation() +
                                ". Transaction ID: " + (paymentReference != null ? paymentReference : "N/A"),
                        "PAYMENT_RECEIVED",
                        String.valueOf(booking.getId())
                );
            } catch (Exception e) {
                log.warn("Notification failed: {}", e.getMessage());
            }

            // Notify rider: UPI payment confirmed
            try {
                notificationService.send(
                        rider.getId(),
                        "UPI Payment Confirmed! ✅",
                        "Your UPI payment of ₹" + booking.getTotalAmount() +
                                " to " + driver.getFullName() + " is complete. Enjoy your ride! 🏍️",
                        "PAYMENT_RECEIVED",
                        String.valueOf(booking.getId())
                );
            } catch (Exception e) {
                log.warn("Notification failed: {}", e.getMessage());
            }

            log.info("UPI payment confirmed: booking={} ref={}", bookingId, paymentReference);
            return ApiResponse.success("UPI payment confirmed! Transaction complete. ✅", null);
        }
    }

    // ── DRIVER CONFIRM CASH (separate endpoint) ──────────────────────
    @Transactional
    public ApiResponse<String> confirmCashPayment(String email, Long bookingId) {
        return markAsPaid(email, bookingId, "CASH-DRIVER-CONFIRMED");
    }

    @Override
    @Transactional
    public ApiResponse<String> cancelBooking(String email, Long bookingId) {
        User user = getUser(email);
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AviroException("Booking not found"));

        boolean isRider  = booking.getRider().getId().equals(user.getId());
        boolean isDriver = booking.getRide().getDriver().getId().equals(user.getId());

        if (!isRider && !isDriver) {
            throw new AviroException("You are not authorized to cancel this booking");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        Ride ride = booking.getRide();
        ride.setAvailableSeats(ride.getAvailableSeats() + booking.getSeatsBooked());
        rideRepository.save(ride);

        try {
            Long notifyUserId = isRider ? ride.getDriver().getId() : booking.getRider().getId();
            String cancelledBy = isRider ? user.getFullName() + " (rider)" : user.getFullName() + " (driver)";
            notificationService.send(
                    notifyUserId,
                    "Booking Cancelled",
                    cancelledBy + " cancelled the ride from " + ride.getFromLocation() +
                            " to " + ride.getToLocation(),
                    "BOOKING_CANCELLED",
                    String.valueOf(booking.getId())
            );
        } catch (Exception e) {
            log.warn("In-app notification failed: {}", e.getMessage());
        }

        return ApiResponse.success("Booking cancelled successfully", null);
    }

    @Override
    public ApiResponse<List<BookingResponse>> getRideBookings(String email, Long rideId) {
        User driver = getUser(email);
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new AviroException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new AviroException("Only the driver can view ride bookings");
        }

        List<Booking> bookings = bookingRepository.findByRideId(rideId);
        return ApiResponse.success(bookings.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    private BookingResponse toResponse(Booking booking) {
        User driver = booking.getRide().getDriver();
        Vehicle vehicle = driver.getVehicle();
        User rider = booking.getRider();

        String genderLabel = switch (driver.getGender()) {
            case MALE   -> "Male driver";
            case FEMALE -> "Female driver";
            default     -> "Driver";
        };

        return BookingResponse.builder()
                .id(booking.getId())
                .rideId(booking.getRide().getId())
                .fromLocation(booking.getRide().getFromLocation())
                .toLocation(booking.getRide().getToLocation())
                .departureTime(booking.getRide().getDepartureTime())
                .seatsBooked(booking.getSeatsBooked())
                .totalAmount(booking.getTotalAmount())
                .status(booking.getStatus())
                .paymentStatus(booking.getPaymentStatus())
                .paymentMethod(booking.getPaymentMethod())
                .pickupPoint(booking.getPickupPoint())
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
                .rider(BookingResponse.RiderInfo.builder()
                        .id(rider.getId())
                        .fullName(rider.getFullName())
                        .gender(rider.getGender())
                        .collegeName(rider.getCollegeName())
                        .profilePicUrl(rider.getProfilePicUrl())
                        .rating(rider.getRating())
                        .build())
                .createdAt(booking.getCreatedAt())
                .build();
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AviroException("User not found"));
    }
}