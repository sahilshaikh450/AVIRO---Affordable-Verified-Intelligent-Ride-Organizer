
package com.aviro.service;

import com.aviro.entity.User;
import com.aviro.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
public class CollegeIdVerificationService {

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    // Render Environment variables
    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    @Value("${GEMINI_MODEL:gemini-3.5-flash-lite}")
    private String geminiModel;

    private static final String GEMINI_API_BASE =
            "https://generativelanguage.googleapis.com/v1beta/models/";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    public VerificationResult verifyCollegeId(
            Long userId, String imagePath) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Never auto-approve when AI is unavailable.
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            log.warn("GEMINI_API_KEY is missing; manual review required");
            return pendingReview();
        }

        try {
            Path filePath = Paths.get(imagePath);

            if (!Files.isRegularFile(filePath)) {
                log.error("College ID image not found: {}", imagePath);
                return pendingReview();
            }

            byte[] imageBytes = Files.readAllBytes(filePath);

            if (imageBytes.length == 0) {
                log.warn("Empty college ID image for user {}", userId);
                return pendingReview();
            }

            String mimeType = detectMimeType(filePath);

            if (mimeType == null) {
                log.warn("Unsupported college ID image type");
                return pendingReview();
            }

            String prompt = buildPrompt(user.getCollegeName());

            // Build valid JSON safely using Jackson.
            ObjectNode requestBody = objectMapper.createObjectNode();
            ArrayNode contents = requestBody.putArray("contents");
            ObjectNode content = contents.addObject();
            ArrayNode parts = content.putArray("parts");

            ObjectNode imagePart = parts.addObject();
            ObjectNode inlineData = imagePart.putObject("inline_data");
            inlineData.put("mime_type", mimeType);
            inlineData.put(
                    "data",
                    Base64.getEncoder().encodeToString(imageBytes)
            );

            parts.addObject().put("text", prompt);

            ObjectNode generationConfig =
                    requestBody.putObject("generationConfig");
            generationConfig.put("temperature", 0.1);
            generationConfig.put("maxOutputTokens", 300);
            generationConfig.put("responseMimeType", "application/json");

            String endpoint = GEMINI_API_BASE
                    + geminiModel
                    + ":generateContent";

            // API key is sent as a header, not logged or exposed in responses.
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(45))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", geminiApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(
                            objectMapper.writeValueAsString(requestBody)))
                    .build();

            log.info(
                    "Starting college ID AI verification for user {}",
                    userId
            );

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            log.info("Gemini API status: {}", response.statusCode());

            if (response.statusCode() != 200) {
                // Log status only; avoid logging sensitive image data.
                log.error(
                        "Gemini verification failed with HTTP status {}",
                        response.statusCode()
                );
                return pendingReview();
            }

            return parseGeminiResponse(response.body(), user);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("College ID verification interrupted for user {}", userId);
            return pendingReview();

        } catch (Exception e) {
            log.error(
                    "College ID verification failed for user {}: {}",
                    userId,
                    e.getMessage()
            );
            return pendingReview();
        }
    }

    private String buildPrompt(String collegeName) {
        return """
                Review this image for AVIRO college ID verification.

                Determine whether it appears to be an Indian college or
                university student identity card.

                Look for a student name, institution name, and student
                identifier where visible.

                Claimed institution: %s

                Do not assume authenticity from appearance alone. If the
                image is ambiguous, unreadable, or lacks sufficient
                evidence, set approved to false.

                Return JSON only:
                {
                  "approved": false,
                  "confidence": "LOW",
                  "reason": "Brief explanation"
                }
                """.formatted(
                collegeName == null || collegeName.isBlank()
                        ? "Not provided"
                        : collegeName
        );
    }

    private VerificationResult parseGeminiResponse(
            String responseBody, User user) {

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode parts = root.path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts");

            if (!parts.isArray() || parts.isEmpty()) {
                log.warn("Gemini returned no response text");
                return pendingReview();
            }

            String text = parts.get(0).path("text").asText("");

            if (text.isBlank()) {
                return pendingReview();
            }

            JsonNode result = objectMapper.readTree(text);

            boolean approved = result.path("approved").asBoolean(false);
            String reason = result.path("reason")
                    .asText("Manual review required");

            if (!approved) {
                log.info("College ID requires manual review");
                return pendingReview();
            }

            user.setIsCollegeVerified(true);
            userRepository.save(user);

            log.info("College ID AI verification approved");

            return new VerificationResult(
                    true,
                    "College ID verified. You can now book and offer rides."
            );

        } catch (Exception e) {
            log.warn("Could not parse Gemini verification response");
            return pendingReview();
        }
    }

    private VerificationResult pendingReview() {
        return new VerificationResult(
                false,
                "ID uploaded! Admin will verify shortly."
        );
    }

    private String detectMimeType(Path filePath) {
        String name = filePath.getFileName()
                .toString()
                .toLowerCase();

        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (name.endsWith(".png")) {
            return "image/png";
        }
        if (name.endsWith(".webp")) {
            return "image/webp";
        }

        return null;
    }

    public record VerificationResult(
            boolean approved,
            String message
    ) {}
}
