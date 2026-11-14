package com.aviro.repository;

import com.aviro.entity.Ride;
import com.aviro.enums.Gender;
import com.aviro.enums.RideStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RideRepository extends JpaRepository<Ride, Long> {

    @Query("SELECT r.driver.id FROM Ride r WHERE r.id = :rideId")
    java.util.Optional<Long> findDriverIdByRideId(@Param("rideId") Long rideId);

    List<Ride> findByDriverId(Long driverId);

    List<Ride> findByStatus(RideStatus status);

    List<Ride> findTop100ByDriverIdOrderByDepartureTimeDesc(Long driverId);

    @Query(
            value =
                    """
SELECT r.* FROM rides r
JOIN users u ON u.id = r.driver_id
WHERE r.status = 'PENDING'
AND r.available_seats >= :seatsNeeded
AND r.departure_time BETWEEN :from AND :to
AND (:womenOnly = false OR r.women_only = true)
AND (:gender IS NULL OR u.gender = :gender)
AND (:maxPrice IS NULL OR r.price_per_seat <= :maxPrice)
AND (:fromQ = ''
     OR REGEXP_REPLACE(LOWER(r.from_location), '[^a-z0-9]', '') LIKE CONCAT('%', :fromQ, '%')
     OR :fromQ LIKE CONCAT('%', REGEXP_REPLACE(LOWER(r.from_location), '[^a-z0-9]', ''), '%')
     OR (:fromLat IS NOT NULL AND r.from_lat IS NOT NULL
         AND (2 * 6371 * ASIN(SQRT(POWER(SIN(RADIANS(r.from_lat - :fromLat) / 2), 2) + COS(RADIANS(:fromLat)) * COS(RADIANS(r.from_lat)) * POWER(SIN(RADIANS(r.from_lng - :fromLng) / 2), 2)))) <= :fromRadiusKm))
AND (:toQ = ''
     OR REGEXP_REPLACE(LOWER(r.to_location), '[^a-z0-9]', '') LIKE CONCAT('%', :toQ, '%')
     OR :toQ LIKE CONCAT('%', REGEXP_REPLACE(LOWER(r.to_location), '[^a-z0-9]', ''), '%')
     OR (:toLat IS NOT NULL AND r.to_lat IS NOT NULL
         AND (2 * 6371 * ASIN(SQRT(POWER(SIN(RADIANS(r.to_lat - :toLat) / 2), 2) + COS(RADIANS(:toLat)) * COS(RADIANS(r.to_lat)) * POWER(SIN(RADIANS(r.to_lng - :toLng) / 2), 2)))) <= :toRadiusKm))
ORDER BY r.departure_time ASC
LIMIT :limit
""",
            nativeQuery = true)
    List<Ride> searchRides(
            @Param("seatsNeeded") Integer seatsNeeded,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("womenOnly") Boolean womenOnly,
            @Param("gender") String gender,
            @Param("maxPrice") Double maxPrice,
            @Param("fromQ") String fromQ,
            @Param("toQ") String toQ,
            @Param("fromLat") Double fromLat,
            @Param("fromLng") Double fromLng,
            @Param("toLat") Double toLat,
            @Param("toLng") Double toLng,
            @Param("fromRadiusKm") double fromRadiusKm,
            @Param("toRadiusKm") double toRadiusKm,
            @Param("limit") int limit);

    @Query(
            value =
                    """
                    SELECT r.* FROM rides r
                    JOIN users u ON r.driver_id = u.id
                    WHERE r.status = 'PENDING'
                    AND r.available_seats >= :seats
                    AND (6371 * acos(cos(radians(:fromLat)) * cos(radians(r.from_lat))
                         * cos(radians(r.from_lng) - radians(:fromLng))
                         + sin(radians(:fromLat)) * sin(radians(r.from_lat)))) < :radiusKm
                    AND r.departure_time > :now
                    ORDER BY r.departure_time ASC
                    LIMIT 20
                    """,
            nativeQuery = true)
    List<Ride> findNearbyRides(
            @Param("fromLat") Double fromLat,
            @Param("fromLng") Double fromLng,
            @Param("radiusKm") Double radiusKm,
            @Param("seats") Integer seats,
            @Param("now") LocalDateTime now);

    @Query("SELECT r FROM Ride r WHERE r.driver.id = :driverId AND r.status = :status")
    List<Ride> findByDriverAndStatus(
            @Param("driverId") Long driverId, @Param("status") RideStatus status);

    @Query("SELECT COUNT(r) FROM Ride r WHERE r.driver.id = :driverId AND r.status = 'COMPLETED'")
    Long countCompletedByDriver(@Param("driverId") Long driverId);

    @Modifying(flushAutomatically = true)
    @Query(
            "UPDATE Ride r SET r.availableSeats = r.availableSeats - :seats WHERE r.id = :rideId"
                    + " AND r.availableSeats >= :seats")
    int reserveSeats(@Param("rideId") Long rideId, @Param("seats") Integer seats);

    @Modifying(flushAutomatically = true)
    @Query(
            """
UPDATE Ride r SET r.availableSeats =
    CASE WHEN r.availableSeats + :seats > r.totalSeats THEN r.totalSeats ELSE r.availableSeats + :seats END
WHERE r.id = :rideId
""")
    int releaseSeats(@Param("rideId") Long rideId, @Param("seats") Integer seats);
}
