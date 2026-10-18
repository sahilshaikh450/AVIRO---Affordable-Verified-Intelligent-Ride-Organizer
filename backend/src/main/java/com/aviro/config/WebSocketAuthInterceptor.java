package com.aviro.config;

import com.aviro.repository.UserRepository;
import com.aviro.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;

/**
 * Reads the JWT from the STOMP CONNECT frame and sets the session user.
 * The principal name is the user's id, so convertAndSendToUser(userId, ...)
 * reaches clients subscribed to /user/queue/...
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            log.debug("WebSocket CONNECT without token");
            return message;
        }

        String token = header.substring(7);
        if (!jwtTokenProvider.validateToken(token)) {
            log.warn("WebSocket CONNECT with invalid token");
            return message;
        }

        String email = jwtTokenProvider.getEmailFromToken(token);
        userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
            String userId = String.valueOf(user.getId());
            Principal principal = () -> userId;
            accessor.setUser(principal);
            log.debug("WebSocket connected for user {}", userId);
        });

        return message;
    }
}
