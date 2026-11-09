package com.aviro.repository;

import com.aviro.entity.RideRequest;
import com.aviro.enums.RideRequestStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface RideRequestRepository extends JpaRepository<RideRequest, Long> {

    @Query(
            """
            SELECT r FROM RideRequest r JOIN FETCH r.rider
            WHERE r.status = :status AND r.desiredTime BETWEEN :from AND :to
            ORDER BY r.desiredTime ASC
            """)
    List<RideRequest> findByStatusAndTimeBetween(
            @Param("status") RideRequestStatus status,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    List<RideRequest> findByRiderIdAndStatusInAndDesiredTimeAfterOrderByDesiredTimeAsc(
            Long riderId, Collection<RideRequestStatus> statuses, LocalDateTime after);

    long countByRiderIdAndStatusAndDesiredTimeAfter(
            Long riderId, RideRequestStatus status, LocalDateTime after);
}
