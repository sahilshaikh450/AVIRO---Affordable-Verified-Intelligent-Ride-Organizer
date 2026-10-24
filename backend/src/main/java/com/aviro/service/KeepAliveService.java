package com.aviro.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Render's free plan puts the service to sleep after 15 minutes without
 * inbound traffic, and waking it takes about two minutes. Calling our own
 * public URL goes through Render's load balancer, so it counts as traffic
 * and keeps the service awake. Runs only when the public URL is known
 * (Render sets RENDER_EXTERNAL_URL automatically), so it is off locally.
 */
@Service
@Slf4j
public class KeepAliveService {

    private final String healthUrl;
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public KeepAliveService(@Value("${aviro.keep-alive.url:${RENDER_EXTERNAL_URL:}}") String baseUrl) {
        this.healthUrl = baseUrl == null || baseUrl.isBlank()
                ? null
                : baseUrl.replaceAll("/+$", "") + "/api/health";
        if (healthUrl != null) {
            log.info("Keep-alive ping enabled: {}", healthUrl);
        }
    }

    @Scheduled(initialDelayString = "${aviro.keep-alive.interval-ms:600000}",
               fixedDelayString = "${aviro.keep-alive.interval-ms:600000}")
    public void ping() {
        if (healthUrl == null) return;
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(healthUrl))
                    .timeout(Duration.ofSeconds(30))
                    .GET()
                    .build();
            HttpResponse<Void> response = client.send(request, HttpResponse.BodyHandlers.discarding());
            log.debug("Keep-alive ping: HTTP {}", response.statusCode());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.warn("Keep-alive ping failed: {}", e.getMessage());
        }
    }
}
