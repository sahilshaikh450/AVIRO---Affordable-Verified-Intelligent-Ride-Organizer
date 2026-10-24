package com.aviro.service;

import com.aviro.entity.Notification;
import com.aviro.entity.User;
import com.aviro.exception.AviroException;
import com.aviro.repository.NotificationRepository;
import com.aviro.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NotificationService {

    // Notifications whose referenceId is a booking id open that trip
    private static final Set<String> TRIP_TYPES = Set.of(
            "BOOKING_REQUEST", "BOOKING_ACCEPTED", "BOOKING_REJECTED", "BOOKING_CANCELLED",
            "TRIP_ON_THE_WAY", "TRIP_ARRIVED", "TRIP_STARTED", "RIDE_COMPLETED",
            "PAYMENT_RECEIVED", "SOS_ALERT");

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate; // <-- ADDED for real-time push
    private final WebPushService webPushService;

    public void send(Long userId, String title, String message, String type, String referenceId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AviroException("User not found"));

        Notification n = Notification.builder()
                .user(user).title(title).message(message)
                .type(type).referenceId(referenceId).build();

        Notification saved = notificationRepository.save(n);

        Runnable deliver = () -> {
            // 🔔 Push instantly via WebSocket to user's notification queue
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(userId),
                    "/queue/notifications",
                    saved
            );
            // 📱 Phone notification, shown even when the app is closed
            webPushService.sendToUser(userId, title, message, linkFor(type, referenceId), type == null ? "aviro" : type);
        };

        // Apps reload the booking when they get this, so send only after the change is committed
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    deliver.run();
                }
            });
        } else {
            deliver.run();
        }
    }

    private String linkFor(String type, String referenceId) {
        if (type != null && TRIP_TYPES.contains(type) && referenceId != null && referenceId.matches("\\d+")) {
            return "/tracking/" + referenceId;
        }
        if ("CHAT_MESSAGE".equals(type)) return "/chat";
        return "/dashboard";
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsRead(userId, false);
    }

    public void deleteNotification(Long userId, Long notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new AviroException("Notification not found"));
        if (!n.getUser().getId().equals(userId)) {
            throw new AviroException("You can only delete your own notifications");
        }
        notificationRepository.delete(n);
    }

    public void markAllRead(Long userId) {
        notificationRepository.markAllRead(userId);
    }
}