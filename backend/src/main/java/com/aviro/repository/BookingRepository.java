package com.aviro.repository;

import com.aviro.entity.Booking;
import com.aviro.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByRiderId(Long riderId);

    List<Booking> findByRideId(Long rideId);

    List<Booking> findByRiderIdAndStatus(Long riderId, BookingStatus status);

    Optional<Booking> findByRideIdAndRiderId(Long rideId, Long riderId);

    // ✅ Added — used in RideServiceImpl to check confirmed bookings before cancel/delete
    long countByRideIdAndStatus(Long rideId, BookingStatus status);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.rider.id = :riderId AND b.status = 'COMPLETED'")
    Long countCompletedByRider(@Param("riderId") Long riderId);

    @Query("SELECT SUM(b.totalAmount) FROM Booking b WHERE b.rider.id = :riderId AND b.paymentStatus = 'COMPLETED'")
    Double totalSpentByRider(@Param("riderId") Long riderId);

    @Query("SELECT b FROM Booking b WHERE b.ride.id = :rideId AND b.status IN ('REQUESTED', 'CONFIRMED')")
    List<Booking> findActiveBookingsForRide(@Param("rideId") Long rideId);
}