package com.aviro.entity;

import com.aviro.enums.Gender;
import com.aviro.enums.Role;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    @JsonIgnore // never expose password hash in any JSON response
    private String password;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.RIDER;

    private String collegeName;
    private String collegeIdNumber;
    private String department;
    private String yearOfStudy;
    private String locality;
    private String city;
    private Double homeLat;
    private Double homeLng;
    private String profilePicUrl;
    private String collegeIdPicUrl;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isVerified = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isCollegeVerified = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(nullable = false)
    @Builder.Default
    private Double rating = 5.0;

    @Column(nullable = false)
    @Builder.Default
    private Integer totalRides = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer aviroCredits = 100;

    @Column(nullable = false)
    @Builder.Default
    private Double co2Saved = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean womenOnlyMode = false;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore // vehicle is exposed separately via DTOs, not via raw entity
    private Vehicle vehicle;

    @OneToMany(mappedBy = "rider", cascade = CascadeType.ALL)
    @Builder.Default
    @JsonIgnore // CRITICAL: prevents User -> bookings -> Booking -> rider(User) infinite loop
    private List<Booking> bookings = new ArrayList<>();

    @OneToMany(mappedBy = "driver", cascade = CascadeType.ALL)
    @Builder.Default
    @JsonIgnore // CRITICAL: prevents User -> ridesOffered -> Ride -> driver(User) infinite loop
    private List<Ride> ridesOffered = new ArrayList<>();

    @ManyToMany
    @JoinTable(
        name = "ride_buddies",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "buddy_id")
    )
    @Builder.Default
    @JsonIgnore // self-referencing many-to-many, also a loop risk
    private List<User> rideBuddies = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "emergency_contacts", joinColumns = @JoinColumn(name = "user_id"))
    @Builder.Default
    private List<String> emergencyContacts = new ArrayList<>();
}