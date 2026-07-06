package com.aviro.service;

import com.aviro.entity.Notification;
import com.aviro.entity.User;
import com.aviro.exception.AviroException;
import com.aviro.repository.NotificationRepository;
import com.aviro.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate; // <-- ADDED for real-time push

    public void send(Long userId, String title, String message, String type, String referenceId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AviroException("User not found"));

        Notification n = Notification.builder()
                .user(user).title(title).message(message)
                .type(type).referenceId(referenceId).build();

        Notification saved = notificationRepository.save(n);

        // 🔔 Push instantly via WebSocket to user's notification queue
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/notifications",
                saved
        );
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsRead(userId, false);
    }

    public void markAllRead(Long userId) {
        notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().filter(n -> !n.getIsRead()).forEach(n -> {
                    n.setIsRead(true);
                    notificationRepository.save(n);
                });
    }
}