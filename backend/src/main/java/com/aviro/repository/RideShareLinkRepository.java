package com.aviro.repository;

import com.aviro.entity.RideShareLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface RideShareLinkRepository extends JpaRepository<RideShareLink, Long> {

    Optional<RideShareLink> findByToken(String token);

    Optional<RideShareLink> findFirstByBookingIdAndSharerIdAndExpiresAtAfter(Long bookingId, Long sharerId, LocalDateTime now);
}
