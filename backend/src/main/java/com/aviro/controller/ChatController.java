package com.aviro.controller;

import com.aviro.dto.response.ApiResponse;
import com.aviro.entity.ChatMessage;
import com.aviro.service.ChatService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    // WebSocket handler - /app/chat.send
    @MessageMapping("/chat.send")
    public void sendMessageWS(@Payload ChatSocketMessage message) {
        // Save to DB
        ChatMessage saved = chatService.saveMessage(
                message.getSenderId(),
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

        // Send back to sender too (for confirmation)
        messagingTemplate.convertAndSendToUser(
                String.valueOf(message.getSenderId()),
                "/queue/messages",
                saved
        );
    }

    // REST fallback - POST /chat/send
    @PostMapping("/send")
    public ResponseEntity<ApiResponse<ChatMessage>> sendMessageREST(
            @RequestBody ChatSocketMessage message) {

        ChatMessage saved = chatService.saveMessage(
                message.getSenderId(),
                message.getReceiverId(),
                message.getRideId(),
                message.getContent(),
                message.getType() != null ? message.getType() : "TEXT"
        );

        // Notify receiver via WebSocket
        messagingTemplate.convertAndSendToUser(
                String.valueOf(message.getReceiverId()),
                "/queue/messages",
                saved
        );

        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    // GET conversation
    @GetMapping("/{rideId}/{otherUserId}")
    public ResponseEntity<ApiResponse<List<ChatMessage>>> getConversation(
            @PathVariable Long rideId,
            @PathVariable Long otherUserId,
            @RequestParam Long myId) {
        List<ChatMessage> messages = chatService.getConversation(rideId, myId, otherUserId);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    @GetMapping("/unread/{senderId}/{receiverId}")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @PathVariable Long senderId,
            @PathVariable Long receiverId) {
        return ResponseEntity.ok(ApiResponse.success(
                chatService.getUnreadCount(senderId, receiverId)
        ));
    }

    @PostMapping("/mark-read/{senderId}/{receiverId}")
    public ResponseEntity<ApiResponse<String>> markRead(
            @PathVariable Long senderId,
            @PathVariable Long receiverId) {
        chatService.markAsRead(senderId, receiverId);
        return ResponseEntity.ok(ApiResponse.success("Messages marked as read", null));
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