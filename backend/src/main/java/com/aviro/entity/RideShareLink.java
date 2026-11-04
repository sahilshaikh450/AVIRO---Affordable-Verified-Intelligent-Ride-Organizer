package com.aviro.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

// A link a rider or driver sends to family so they can follow the trip without an AVIRO account
@Entity
@Table(name = "ride_share_links", indexes = {
        @Index(name = "idx_share_link_token", columnList = "token", unique = true),
        @Index(name = "idx_share_link_booking_sharer", columnList = "booking_id, sharer_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RideShareLink extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Random and unguessable: whoever has it can see this one trip
    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sharer_id", nullable = false)
    private User sharer;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
