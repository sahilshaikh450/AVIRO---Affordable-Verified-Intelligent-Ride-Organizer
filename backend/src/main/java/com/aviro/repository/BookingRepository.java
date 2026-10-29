package com.aviro.repository;

import com.aviro.entity.Booking;
import com.aviro.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByRiderId(Long riderId);

    // Ids only, so callers outside a transaction (WebSocket handlers) don't hit lazy loading
    @Query("SELECT b.rider.id FROM Booking b WHERE b.id = :bookingId")
    Optional<Long> findRiderIdByBookingId(@Param("bookingId") Long bookingId);

    @Query("SELECT b.ride.driver.id FROM Booking b WHERE b.id = :bookingId")
    Optional<Long> findDriverIdByBookingId(@Param("bookingId") Long bookingId);

    List<Booking> findByRideId(Long rideId);

    List<Booking> findByRiderIdAndStatus(Long riderId, BookingStatus status);

    Optional<Booking> findByRideIdAndRiderId(Long rideId, Long riderId);

    boolean existsByRideIdAndRiderIdAndStatusIn(Long rideId, Long riderId, Collection<BookingStatus> statuses);

    // ✅ Added — used in RideServiceImpl to check confirmed bookings before cancel/delete
    long countByRideIdAndStatus(Long rideId, BookingStatus status);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.rider.id = :riderId AND b.status = 'COMPLETED'")
    Long countCompletedByRider(@Param("riderId") Long riderId);

    @Query("SELECT SUM(b.totalAmount) FROM Booking b WHERE b.rider.id = :riderId AND b.paymentStatus = 'COMPLETED'")
    Double totalSpentByRider(@Param("riderId") Long riderId);

    // True when one of the two users drives this ride and the other has booked it
    @Query("""
        SELECT COUNT(b) > 0 FROM Booking b
        WHERE b.ride.id = :rideId
        AND ((b.rider.id = :userA AND b.ride.driver.id = :userB) OR (b.rider.id = :userB AND b.ride.driver.id = :userA))
        """)
    boolean sharesRide(@Param("rideId") Long rideId, @Param("userA") Long userA, @Param("userB") Long userB);

    @Query("SELECT b FROM Booking b WHERE b.ride.id = :rideId AND b.status IN ('REQUESTED', 'CONFIRMED')")
    List<Booking> findActiveBookingsForRide(@Param("rideId") Long rideId);
}