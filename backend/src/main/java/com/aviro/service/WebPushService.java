package com.aviro.service;

import com.aviro.entity.PushSubscription;
import com.aviro.repository.PushSubscriptionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Urgency;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Sends phone/desktop push notifications (Web Push with VAPID), so alerts show
 * up like WhatsApp even when AVIRO is closed. Off unless VAPID keys are set.
 */
@Service
@Slf4j
public class WebPushService {

    // Ride alerts are useless after a few hours, so the push service may drop them after that
    private static final int TTL_SECONDS = 6 * 60 * 60;

    private final PushSubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;
    private final String publicKey;
    private final List<String> allowedHosts;
    private final PushService pushService;

    public WebPushService(PushSubscriptionRepository subscriptionRepository,
                          ObjectMapper objectMapper,
                          @Value("${aviro.push.vapid-public-key:}") String publicKey,
                          @Value("${aviro.push.vapid-private-key:}") String privateKey,
                          @Value("${aviro.push.subject:mailto:aviro.support@gmail.com}") String subject,
                          @Value("${aviro.push.allowed-hosts:fcm.googleapis.com,updates.push.services.mozilla.com,push.apple.com,notify.windows.com}") String allowedHosts) {
        this.subscriptionRepository = subscriptionRepository;
        this.objectMapper = objectMapper;
        this.publicKey = publicKey;
        this.allowedHosts = Arrays.stream(allowedHosts.split(",")).map(String::trim).filter(h -> !h.isEmpty()).toList();

        PushService service = null;
        if (!publicKey.isBlank() && !privateKey.isBlank()) {
            try {
                if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                    Security.addProvider(new BouncyCastleProvider());
                }
                service = new PushService(publicKey, privateKey, subject);
                log.info("Web push notifications enabled");
            } catch (Exception e) {
                log.error("Web push disabled: invalid VAPID keys ({})", e.getMessage());
            }
        }
        this.pushService = service;
    }

    public boolean isEnabled() {
        return pushService != null;
    }

    public String getPublicKey() {
        return isEnabled() ? publicKey : null;
    }

    // Only real browser push services, so a user cannot make the server call any URL
    public boolean isAllowedEndpoint(String endpoint) {
        try {
            URI uri = URI.create(endpoint);
            String host = uri.getHost();
            boolean secure = "https".equals(uri.getScheme());
            return host != null && allowedHosts.stream().anyMatch(allowed ->
                    (secure || allowed.equals("localhost")) && (host.equals(allowed) || host.endsWith("." + allowed)));
        } catch (Exception e) {
            return false;
        }
    }

    @Async
    public void sendToUser(Long userId, String title, String body, String url, String tag) {
        if (!isEnabled()) return;
        List<PushSubscription> subscriptions = subscriptionRepository.findByUserId(userId);
        if (subscriptions.isEmpty()) return;

        byte[] payload;
        try {
            payload = objectMapper.writeValueAsString(Map.of(
                    "title", title, "body", body, "url", url, "tag", tag
            )).getBytes(StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("Push payload failed: {}", e.getMessage());
            return;
        }

        for (PushSubscription sub : subscriptions) {
            try {
                // aes128gcm is the standard format; Apple devices accept only this one
                Notification notification = Notification.builder()
                        .endpoint(sub.getEndpoint())
                        .userPublicKey(sub.getP256dh())
                        .userAuth(sub.getAuth())
                        .payload(payload)
                        .ttl(TTL_SECONDS)
                        .urgency(Urgency.HIGH) // deliver now, even if the phone is idle
                        .build();
                HttpResponse response = pushService.send(notification, Encoding.AES128GCM);
                int status = response.getStatusLine().getStatusCode();
                if (status == 404 || status == 410) {
                    // The phone unsubscribed or the app was uninstalled
                    subscriptionRepository.delete(sub);
                } else if (status >= 400) {
                    log.warn("Push rejected with HTTP {} for subscription {}", status, sub.getId());
                }
            } catch (Exception e) {
                log.warn("Push failed for subscription {}: {}", sub.getId(), e.getMessage());
            }
        }
    }
}
