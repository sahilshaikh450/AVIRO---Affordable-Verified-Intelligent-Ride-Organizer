package com.aviro.repository;

import com.aviro.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    Optional<Vehicle> findByUserId(Long userId);

    List<Vehicle> findByUserIdIn(Collection<Long> userIds);

    @Query("SELECT v FROM Vehicle v JOIN FETCH v.user WHERE v.isVerified = false")
    List<Vehicle> findPendingWithOwner();

    long countByIsVerifiedTrue();

    boolean existsByUserId(Long userId);

    boolean existsByRegistrationNumber(String registrationNumber);
}