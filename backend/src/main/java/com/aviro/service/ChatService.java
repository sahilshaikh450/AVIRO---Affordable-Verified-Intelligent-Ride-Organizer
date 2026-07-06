package com.aviro.service;

import com.aviro.entity.ChatMessage;
import com.aviro.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;

    public ChatMessage saveMessage(Long senderId, Long receiverId, Long rideId, String content, String type) {
        ChatMessage msg = ChatMessage.builder()
                .senderId(senderId)
                .receiverId(receiverId)
                .rideId(rideId)
                .content(content)
                .messageType(type != null ? type : "TEXT")
                .build();
        return chatMessageRepository.save(msg);
    }

    public List<ChatMessage> getConversation(Long rideId, Long userId1, Long userId2) {
        return chatMessageRepository.findConversation(rideId, userId1, userId2);
    }

    public void markAsRead(Long senderId, Long receiverId) {
        chatMessageRepository
                .findAll()
                .stream()
                .filter(m -> m.getSenderId().equals(senderId)
                        && m.getReceiverId().equals(receiverId)
                        && !m.getIsRead())
                .forEach(m -> {
                    m.setIsRead(true);
                    chatMessageRepository.save(m);
                });
    }

    public Long getUnreadCount(Long senderId, Long receiverId) {
        return chatMessageRepository.countBySenderIdAndReceiverIdAndIsRead(senderId, receiverId, false);
    }
}
