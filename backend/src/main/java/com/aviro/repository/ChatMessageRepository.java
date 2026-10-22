package com.aviro.repository;

import com.aviro.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("""
        SELECT m FROM ChatMessage m
        WHERE m.rideId = :rideId
        AND ((m.senderId = :userId1 AND m.receiverId = :userId2)
          OR (m.senderId = :userId2 AND m.receiverId = :userId1))
        ORDER BY m.createdAt ASC
        """)
    List<ChatMessage> findConversation(
        @Param("rideId") Long rideId,
        @Param("userId1") Long userId1,
        @Param("userId2") Long userId2
    );

    Long countBySenderIdAndReceiverIdAndIsRead(Long senderId, Long receiverId, Boolean isRead);

    @Modifying
    @Transactional
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.senderId = :senderId AND m.receiverId = :receiverId AND m.isRead = false")
    int markRead(@Param("senderId") Long senderId, @Param("receiverId") Long receiverId);
}
