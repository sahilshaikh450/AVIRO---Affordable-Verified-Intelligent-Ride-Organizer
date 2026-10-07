package com.aviro.repository;

import com.aviro.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    Optional<Vehicle> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    boolean existsByRegistrationNumber(String registrationNumber);
}