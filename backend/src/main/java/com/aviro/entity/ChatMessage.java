  package com.aviro.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long senderId;

    @Column(nullable = false)
    private Long receiverId;

    @Column(nullable = false)
    private Long rideId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    private String messageType;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isRead = false;
}
