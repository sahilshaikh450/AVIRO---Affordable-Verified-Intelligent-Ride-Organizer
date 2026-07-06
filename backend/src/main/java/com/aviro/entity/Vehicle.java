package com.aviro.entity;

import com.aviro.enums.VehicleType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "vehicles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleType vehicleType;

    @Column(nullable = false)
    private String registrationNumber;

    private String make;
    private String model;
    private String color;
    private Integer year;

    @Column(nullable = false)
    private Integer totalSeats;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isVerified = false;

    private String rcDocUrl;
    private String insuranceDocUrl;
}
