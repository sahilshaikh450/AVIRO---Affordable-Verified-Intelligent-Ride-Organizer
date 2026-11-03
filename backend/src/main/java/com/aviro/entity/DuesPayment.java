package com.aviro.entity;

import com.aviro.enums.DuesPaymentStatus;
import jakarta.persistence.*;
import lombok.*;

// A driver paying their AVIRO fees to the platform's UPI account
@Entity
@Table(name = "dues_payments", indexes = @Index(name = "idx_dues_driver_status", columnList = "driver_id, status"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DuesPayment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @Column(nullable = false)
    private Double amount;

    // UPI transaction ID / UTR the driver typed, to match against the bank statement
    @Column(length = 64)
    private String reference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DuesPaymentStatus status = DuesPaymentStatus.PENDING;
}
