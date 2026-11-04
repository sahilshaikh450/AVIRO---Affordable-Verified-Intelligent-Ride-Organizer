package com.aviro.entity;

import com.aviro.enums.SafetyReportStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

// A rider or driver reporting the other person on a trip; reviewed by an admin
@Entity
@Table(name = "safety_reports", indexes = {
        @Index(name = "idx_safety_report_status", columnList = "status, created_at"),
        @Index(name = "idx_safety_report_booking_reporter", columnList = "booking_id, reporter_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SafetyReport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_user_id", nullable = false)
    private User reportedUser;

    @Column(nullable = false, length = 100)
    private String reason;

    @Column(length = 1000)
    private String details;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SafetyReportStatus status = SafetyReportStatus.OPEN;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
