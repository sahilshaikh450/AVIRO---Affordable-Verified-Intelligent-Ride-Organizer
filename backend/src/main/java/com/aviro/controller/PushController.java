package com.aviro.controller;

import com.aviro.dto.response.ApiResponse;
import com.aviro.entity.PushSubscription;
import com.aviro.entity.User;
import com.aviro.exception.AviroException;
import com.aviro.repository.PushSubscriptionRepository;
import com.aviro.repository.UserRepository;
import com.aviro.service.WebPushService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/push")
@RequiredArgsConstructor
public class PushController {

    private final WebPushService webPushService;
    private final PushSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;

    // The browser needs this key to create a push subscription
    @GetMapping("/public-key")
    public ApiResponse<Map<String, Object>> publicKey() {
        Map<String, Object> data = new HashMap<>();
        data.put("enabled", webPushService.isEnabled());
        data.put("publicKey", webPushService.getPublicKey());
        return ApiResponse.success(data);
    }

    @PostMapping("/subscribe")
    @Transactional
    public ApiResponse<String> subscribe(@AuthenticationPrincipal UserDetails userDetails,
                                         @RequestBody SubscribeRequest request) {
        if (request.getEndpoint() == null || request.getKeys() == null
                || request.getKeys().getP256dh() == null || request.getKeys().getAuth() == null) {
            throw new AviroException("Invalid push subscription");
        }
        if (!webPushService.isAllowedEndpoint(request.getEndpoint())) {
            throw new AviroException("Unsupported push service");
        }
        User user = currentUser(userDetails);

        // One row per device; a device that switched accounts moves to the new user
        PushSubscription sub = subscriptionRepository.findByEndpoint(request.getEndpoint())
                .orElseGet(() -> PushSubscription.builder().endpoint(request.getEndpoint()).build());
        sub.setUser(user);
        sub.setP256dh(request.getKeys().getP256dh());
        sub.setAuth(request.getKeys().getAuth());
        subscriptionRepository.save(sub);
        return ApiResponse.success("Notifications turned on", null);
    }

    @DeleteMapping("/subscribe")
    @Transactional
    public ApiResponse<String> unsubscribe(@AuthenticationPrincipal UserDetails userDetails,
                                           @RequestBody SubscribeRequest request) {
        User user = currentUser(userDetails);
        subscriptionRepository.findByEndpoint(String.valueOf(request.getEndpoint()))
                .filter(sub -> sub.getUser().getId().equals(user.getId()))
                .ifPresent(subscriptionRepository::delete);
        return ApiResponse.success("Notifications turned off", null);
    }

    private User currentUser(UserDetails userDetails) {
        return userRepository.findByEmailNormalized(userDetails.getUsername())
                .orElseThrow(() -> new AviroException("User not found"));
    }

    @Data
    public static class SubscribeRequest {
        private String endpoint;
        private Keys keys;

        @Data
        public static class Keys {
            private String p256dh;
            private String auth;
        }
    }
}
