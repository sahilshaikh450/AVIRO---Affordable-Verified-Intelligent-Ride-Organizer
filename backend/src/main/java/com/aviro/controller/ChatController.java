package com.aviro.controller;

import com.aviro.dto.response.ApiResponse;
import com.aviro.entity.ChatMessage;
import com.aviro.exception.AviroException;
import com.aviro.repository.BookingRepository;
import com.aviro.repository.UserRepository;
import com.aviro.service.ChatService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    // WebSocket handler - /app/chat.send
    // Sender always comes from the authenticated session, never from the payload
    @MessageMapping("/chat.send")
    public void sendMessageWS(@Payload ChatSocketMessage message, Principal principal) {
        if (principal == null) {
            log.warn("Rejected chat message from unauthenticated WebSocket session");
            return;
        }
        Long senderId = Long.valueOf(principal.getName());

        ChatMessage saved = saveAndDeliver(senderId, message);

        // Send back to sender too (for confirmation)
        messagingTemplate.convertAndSendToUser(
                String.valueOf(senderId),
                "/queue/messages",
                saved
        );
    }

    // REST fallback - POST /chat/send
    @PostMapping("/send")
    public ResponseEntity<ApiResponse<ChatMessage>> sendMessageREST(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChatSocketMessage message) {
        Long senderId = currentUserId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(saveAndDeliver(senderId, message)));
    }

    // GET conversation (myId param kept for old clients, but the logged-in user is used)
    @GetMapping("/{rideId}/{otherUserId}")
    public ResponseEntity<ApiResponse<List<ChatMessage>>> getConversation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long rideId,
            @PathVariable Long otherUserId,
            @RequestParam(required = false) Long myId) {
        Long me = currentUserId(userDetails);
        List<ChatMessage> messages = chatService.getConversation(rideId, me, otherUserId);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    // Unread count of messages sent to me by senderId
    @GetMapping("/unread/{senderId}/{receiverId}")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long senderId,
            @PathVariable Long receiverId) {
        requireSelf(userDetails, receiverId);
        return ResponseEntity.ok(ApiResponse.success(
                chatService.getUnreadCount(senderId, receiverId)
        ));
    }

    @PostMapping("/mark-read/{senderId}/{receiverId}")
    public ResponseEntity<ApiResponse<String>> markRead(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long senderId,
            @PathVariable Long receiverId) {
        requireSelf(userDetails, receiverId);
        chatService.markAsRead(senderId, receiverId);
        return ResponseEntity.ok(ApiResponse.success("Messages marked as read", null));
    }

    private ChatMessage saveAndDeliver(Long senderId, ChatSocketMessage message) {
        // Only the driver and a rider of the same ride can message each other
        if (message.getRideId() == null || message.getReceiverId() == null
                || !bookingRepository.sharesRide(message.getRideId(), senderId, message.getReceiverId())) {
            throw new AccessDeniedException("You can only message people on your rides");
        }
        ChatMessage saved = chatService.saveMessage(
                senderId,
                message.getReceiverId(),
                message.getRideId(),
                message.getContent(),
                message.getType() != null ? message.getType() : "TEXT"
        );

        // Send to receiver
        messagingTemplate.convertAndSendToUser(
                String.valueOf(message.getReceiverId()),
                "/queue/messages",
                saved
        );
        return saved;
    }

    private Long currentUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new AviroException("User not found"))
                .getId();
    }

    private void requireSelf(UserDetails userDetails, Long userId) {
        if (!currentUserId(userDetails).equals(userId)) {
            throw new AccessDeniedException("You can only access your own messages");
        }
    }

    @Data
    public static class ChatSocketMessage {
        private Long senderId;
        private Long receiverId;
        private Long rideId;
        private String content;
        private String type;
        private String messageType;
    }
}