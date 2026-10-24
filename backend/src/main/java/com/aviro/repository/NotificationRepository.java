package com.aviro.repository;

import com.aviro.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    void deleteByUserId(Long userId);
    Long countByUserIdAndIsRead(Long userId, Boolean isRead);

    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user.id = :userId AND n.isRead = false")
    int markAllRead(@Param("userId") Long userId);

    // One statement instead of loading and deleting each row
    @Modifying
    @Transactional
    @Query("DELETE FROM Notification n WHERE n.user.id = :userId")
    int deleteAllForUser(@Param("userId") Long userId);
}
