package com.aviro.controller;

import com.aviro.dto.response.ApiResponse;
import com.aviro.entity.Booking;
import com.aviro.entity.ChatMessage;
import com.aviro.entity.User;
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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private static final int OPEN_HOURS_AFTER_DEPARTURE = 12;

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    private static final int MAX_MESSAGE_LENGTH = 1000;

    @MessageMapping("/chat.send")
    public void sendMessageWS(@Payload ChatSocketMessage message, Principal principal) {
        if (principal == null) {
            log.warn("Rejected chat message from unauthenticated WebSocket session");
            return;
        }
        Long senderId = Long.valueOf(principal.getName());

        ChatMessage saved = saveAndDeliver(senderId, message);

        messagingTemplate.convertAndSendToUser(String.valueOf(senderId), "/queue/messages", saved);
    }

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<ChatMessage>> sendMessageREST(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChatSocketMessage message) {
        Long senderId = currentUserId(userDetails);
        return ResponseEntity.ok(ApiResponse.success(saveAndDeliver(senderId, message)));
    }

    @GetMapping("/{rideId}/{otherUserId}")
    public ResponseEntity<ApiResponse<List<ChatMessage>>> getConversation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long rideId,
            @PathVariable Long otherUserId,
            @RequestParam(required = false) Long myId) {
        Long me = currentUserId(userDetails);
        requireOpenChat(rideId, me, otherUserId);
        List<ChatMessage> messages = chatService.getConversation(rideId, me, otherUserId);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    @GetMapping("/unread/{senderId}/{receiverId}")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long senderId,
            @PathVariable Long receiverId) {
        requireSelf(userDetails, receiverId);
        return ResponseEntity.ok(
                ApiResponse.success(chatService.getUnreadCount(senderId, receiverId)));
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
        if (message.getRideId() == null || message.getReceiverId() == null) {
            throw new AccessDeniedException("You can only message people on your rides");
        }
        requireOpenChat(message.getRideId(), senderId, message.getReceiverId());
        String content = message.getContent() == null ? "" : message.getContent().trim();
        if (content.isEmpty() || content.length() > MAX_MESSAGE_LENGTH) {
            throw new AviroException("Messages must be 1 to " + MAX_MESSAGE_LENGTH + " characters");
        }
        message.setContent(content);
        ChatMessage saved =
                chatService.saveMessage(
                        senderId,
                        message.getReceiverId(),
                        message.getRideId(),
                        message.getContent(),
                        message.getType() != null ? message.getType() : "TEXT");

        messagingTemplate.convertAndSendToUser(
                String.valueOf(message.getReceiverId()), "/queue/messages", saved);
        return saved;
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> activeChats(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long me = currentUserId(userDetails);
        List<Map<String, Object>> chats = new ArrayList<>();
        for (Booking b :
                bookingRepository.findOpenChats(
                        me, LocalDateTime.now().minusHours(OPEN_HOURS_AFTER_DEPARTURE))) {
            boolean iDrive = b.getRide().getDriver().getId().equals(me);
            User other = iDrive ? b.getRider() : b.getRide().getDriver();
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("bookingId", b.getId());
            c.put("rideId", b.getRide().getId());
            c.put("otherId", other.getId());
            c.put("otherName", other.getFullName());
            c.put("otherGender", other.getGender());
            c.put("role", iDrive ? "Rider" : "Driver");
            c.put("fromLocation", b.getRide().getFromLocation());
            c.put("toLocation", b.getRide().getToLocation());
            c.put("departureTime", b.getRide().getDepartureTime());
            c.put("tripStage", b.getTripStage());
            chats.add(c);
        }
        return ResponseEntity.ok(ApiResponse.success(chats));
    }

    private void requireOpenChat(Long rideId, Long a, Long b) {
        if (!bookingRepository.sharesRide(rideId, a, b)) {
            throw new AccessDeniedException("You can only message people on your rides");
        }
        if (!bookingRepository.sharesConfirmedRide(rideId, a, b)) {
            throw new AviroException(
                    "Chat opens when the driver confirms the ride and closes when the trip ends");
        }
    }

    private Long currentUserId(UserDetails userDetails) {
        return userRepository
                .findByEmail(userDetails.getUsername())
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
