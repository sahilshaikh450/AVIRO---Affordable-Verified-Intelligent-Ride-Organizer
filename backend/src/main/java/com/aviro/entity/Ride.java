package com.aviro.entity;

import com.aviro.enums.Gender;
import com.aviro.enums.RideStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rides")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ride extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @Column(nullable = false)
    private String fromLocation;

    @Column(nullable = false)
    private Double fromLat;

    @Column(nullable = false)
    private Double fromLng;

    @Column(nullable = false)
    private String toLocation;

    @Column(nullable = false)
    private Double toLat;

    @Column(nullable = false)
    private Double toLng;

    @Column(nullable = false)
    private LocalDateTime departureTime;

    @Column(nullable = false)
    private Integer totalSeats;

    @Column(nullable = false)
    @Builder.Default
    private Integer availableSeats = 1;

    @Column(nullable = false)
    private Double pricePerSeat;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RideStatus status = RideStatus.PENDING;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isRecurring = false;

    private String recurringDays;

    @Enumerated(EnumType.STRING)
    private Gender allowedGender;

    @Column(nullable = false)
    @Builder.Default
    private Boolean womenOnly = false;

    private String routePolyline;
    private String notes;

    @OneToMany(mappedBy = "ride", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Booking> bookings = new ArrayList<>();
}
