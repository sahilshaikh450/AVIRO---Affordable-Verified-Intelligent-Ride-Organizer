package com.aviro.config;

import com.aviro.enums.BookingStatus;
import com.aviro.repository.BookingRepository;
import com.aviro.repository.RideRepository;
import com.aviro.repository.UserRepository;
import com.aviro.security.JwtTokenProvider;
import com.aviro.security.TokenBlacklistService;

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
import java.util.EnumSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final TokenBlacklistService tokenBlacklistService;
    private final RideRepository rideRepository;
    private final BookingRepository bookingRepository;

    private static final Pattern RIDE_TOPIC = Pattern.compile("^/topic/(track|sos)/(\\d+)$");
    private static final Set<BookingStatus> TRACKING_STATUSES = EnumSet.of(BookingStatus.CONFIRMED);
    private static final Set<BookingStatus> SOS_STATUSES =
            EnumSet.of(BookingStatus.REQUESTED, BookingStatus.CONFIRMED, BookingStatus.COMPLETED);

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) return message;

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            return canSubscribe(accessor.getUser(), accessor.getDestination()) ? message : null;
        }

        if (!StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            log.debug("WebSocket CONNECT without token");
            return message;
        }

        String token = header.substring(7);
        if (!jwtTokenProvider.validateToken(token)
                || !jwtTokenProvider.isAccessToken(token)
                || tokenBlacklistService.isRevoked(token)) {
            log.warn("WebSocket CONNECT with invalid token");
            return message;
        }

        String email = jwtTokenProvider.getEmailFromToken(token);
        userRepository
                .findByEmailNormalized(email)
                .ifPresent(
                        user -> {
                            String userId = String.valueOf(user.getId());
                            Principal principal = () -> userId;
                            accessor.setUser(principal);
                            log.debug("WebSocket connected for user {}", userId);
                        });

        return message;
    }

    private boolean canSubscribe(Principal user, String destination) {
        if (destination == null || !destination.startsWith("/topic/")) return true;
        Matcher m = RIDE_TOPIC.matcher(destination);
        if (user == null || !m.matches()) {
            log.warn(
                    "Rejected subscription to {} by {}",
                    destination,
                    user == null ? "anonymous" : user.getName());
            return false;
        }
        Long userId = Long.valueOf(user.getName());
        Long rideId = Long.valueOf(m.group(2));
        if (userId.equals(rideRepository.findDriverIdByRideId(rideId).orElse(null))) return true;
        Set<BookingStatus> allowed = "track".equals(m.group(1)) ? TRACKING_STATUSES : SOS_STATUSES;
        boolean ok = bookingRepository.existsByRideIdAndRiderIdAndStatusIn(rideId, userId, allowed);
        if (!ok) log.warn("Rejected subscription to {} by user {}", destination, userId);
        return ok;
    }
}
