package com.aviro.entity;

import com.aviro.enums.RideRequestStatus;

import jakarta.persistence.*;

import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "ride_requests",
        indexes = {
            @Index(name = "idx_ride_request_status_time", columnList = "status, desired_time"),
            @Index(name = "idx_ride_request_rider", columnList = "rider_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RideRequest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rider_id", nullable = false)
    private User rider;

    @Column(nullable = false, length = 200)
    private String fromLocation;

    @Column(nullable = false, length = 200)
    private String toLocation;

    @Column(name = "desired_time", nullable = false)
    private LocalDateTime desiredTime;

    @Column(nullable = false)
    @Builder.Default
    private Integer seatsNeeded = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RideRequestStatus status = RideRequestStatus.ACTIVE;

    private Long matchedRideId;
}
