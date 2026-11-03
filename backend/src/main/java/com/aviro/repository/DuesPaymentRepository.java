package com.aviro.repository;

import com.aviro.entity.DuesPayment;
import com.aviro.enums.DuesPaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DuesPaymentRepository extends JpaRepository<DuesPayment, Long> {

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM DuesPayment p WHERE p.driver.id = :driverId AND p.status = :status")
    Double sumByDriverAndStatus(@Param("driverId") Long driverId, @Param("status") DuesPaymentStatus status);

    List<DuesPayment> findTop10ByDriverIdOrderByCreatedAtDesc(Long driverId);

    @Query("SELECT p FROM DuesPayment p JOIN FETCH p.driver WHERE p.status = :status ORDER BY p.createdAt ASC")
    List<DuesPayment> findByStatusWithDriver(@Param("status") DuesPaymentStatus status);
}
