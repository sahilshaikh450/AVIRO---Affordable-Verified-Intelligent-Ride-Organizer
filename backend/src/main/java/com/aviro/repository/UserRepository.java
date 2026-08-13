package com.aviro.repository;

import com.aviro.entity.User;
import com.aviro.enums.Gender;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.gender = :gender AND u.isActive = true")
    List<User> findByGender(@Param("gender") Gender gender);

    @Query("SELECT u FROM User u WHERE u.collegeName = :college AND u.isActive = true")
    List<User> findByCollege(@Param("college") String college);

    @Query(value = """
        SELECT * FROM users u
        WHERE u.is_active = true
        AND (6371 * acos(cos(radians(:lat)) * cos(radians(u.home_lat))
             * cos(radians(u.home_lng) - radians(:lng))
             + sin(radians(:lat)) * sin(radians(u.home_lat)))) < :radiusKm
        """, nativeQuery = true)
    List<User> findUsersNearLocation(@Param("lat") Double lat,
                                      @Param("lng") Double lng,
                                      @Param("radiusKm") Double radiusKm);
}
