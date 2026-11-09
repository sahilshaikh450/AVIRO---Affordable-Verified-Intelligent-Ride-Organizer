package com.aviro.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;

import lombok.*;

@Entity
@Table(
        name = "notifications",
        indexes = {
            @Index(name = "idx_notification_user_created", columnList = "user_id, created_at"),
            @Index(name = "idx_notification_user_read", columnList = "user_id, is_read")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    private String type;
    private String referenceId;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isRead = false;
}
