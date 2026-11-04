package com.aviro.repository;

import com.aviro.entity.SafetyReport;
import com.aviro.enums.SafetyReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SafetyReportRepository extends JpaRepository<SafetyReport, Long> {

    boolean existsByBookingIdAndReporterIdAndStatus(Long bookingId, Long reporterId, SafetyReportStatus status);

    // Open reports first, newest first within each group
    @Query("""
        SELECT r FROM SafetyReport r
        JOIN FETCH r.reporter JOIN FETCH r.reportedUser JOIN FETCH r.booking b JOIN FETCH b.ride
        ORDER BY CASE WHEN r.status = com.aviro.enums.SafetyReportStatus.OPEN THEN 0 ELSE 1 END, r.createdAt DESC
        """)
    List<SafetyReport> findAllForAdmin();
}
