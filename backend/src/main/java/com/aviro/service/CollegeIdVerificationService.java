package com.aviro.service;

import com.aviro.entity.User;
import com.aviro.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    @Value("${aviro.claude.api-key:}")
    private String geminiApiKey;

    private static final String GEMINI_API_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=";

    public VerificationResult verifyCollegeId(Long userId, String imagePath) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // ── API Key check ──
            if (geminiApiKey == null || geminiApiKey.isBlank() || geminiApiKey.equals("your_gemini_key")) {
                log.warn("⚠️ Gemini API key not configured — auto approving for now");
                // Auto approve if no API key (development mode)
                user.setIsCollegeVerified(false); // Keep false for admin review
                userRepository.save(user);
                return new VerificationResult(false,
                    "ID uploaded! Admin will verify shortly. (AI verification not configured)");
            }

            // ── Read image file ──
            Path filePath = Paths.get(imagePath);
            if (!Files.exists(filePath)) {
                log.error("Image file not found at path: {}", imagePath);
                return new VerificationResult(false, "Image file not found on server");
            }

            byte[] imageBytes = Files.readAllBytes(filePath);
            if (imageBytes.length == 0) {
                return new VerificationResult(false, "Image file is empty");
            }

            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            String mimeType    = detectMimeType(filePath.toString());

            log.info("Verifying college ID for user {} — file size: {} bytes, type: {}",
                userId, imageBytes.length, mimeType);

            // ── Build request ──
            String prompt      = buildPrompt(user.getCollegeName());
            String promptJson  = objectMapper.valueToTree(prompt).toString();
            String requestBody = String.format("""
                {
                  "contents": [{
                    "parts": [
                      {
                        "inline_data": {
                          "mime_type": "%s",
                          "data": "%s"
                        }
                      },
                      {
                        "text": %s
                      }
                    ]
                  }],
                  "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 300
                  }
                }
                """, mimeType, base64Image, promptJson);

            // ── Call Gemini API ──
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GEMINI_API_URL + geminiApiKey))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

            HttpResponse<String> response = client.send(request,
                HttpResponse.BodyHandlers.ofString());

            log.info("Gemini API status: {}", response.statusCode());

            if (response.statusCode() == 400) {
                log.error("Gemini 400 error: {}", response.body());
                return new VerificationResult(false,
                    "ID uploaded! Pending admin review. (AI error 400 — check API key)");
            }

            if (response.statusCode() == 403) {
                log.error("Gemini 403 — Invalid API key");
                return new VerificationResult(false,
                    "ID uploaded! Pending admin review. (Invalid Gemini API key)");
            }

            if (response.statusCode() != 200) {
                log.error("Gemini API error {}: {}", response.statusCode(), response.body());
                return new VerificationResult(false,
                    "ID uploaded! Admin will verify shortly.");
            }

            return parseGeminiResponse(response.body(), userId, user);

        } catch (Exception e) {
            log.error("ID verification error for user {}: {}", userId, e.getMessage(), e);
            return new VerificationResult(false,
                "ID uploaded! Admin will verify. (Error: " + e.getMessage() + ")");
        }
    }

    private String buildPrompt(String collegeName) {
        return String.format("""
            You are a college ID verification system for AVIRO, a ride-sharing app for Pune college students.
            
            Analyze this image and determine if it is a valid Indian college/university student ID card.
            
            Check for:
            1. Is this a student ID card or college identity card?
            2. Does it have a student name visible?
            3. Does it have a college or institution name?
            4. Does it have a student ID, enrollment number, or PRN?
            5. Is it from an Indian educational institution?
            
            Student claims to be from: %s
            
            RULES:
            - APPROVE if it looks like a genuine college student ID card
            - APPROVE even if partially visible or slightly blurry, as long as it's clearly a college ID
            - REJECT only if it is clearly NOT a student ID (Aadhaar, PAN, driving license, random photo, blank image)
            - Be lenient — student IDs come in many formats
            
            Reply ONLY with this exact JSON (no other text, no markdown):
            {"approved": true, "confidence": "HIGH", "reason": "Valid college ID card detected"}
            """, collegeName != null ? collegeName : "a Pune college");
    }

    private VerificationResult parseGeminiResponse(String responseBody, Long userId, User user) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");

            if (candidates.isEmpty() || candidates.get(0).isMissingNode()) {
                log.error("No candidates in Gemini response: {}", responseBody);
                return new VerificationResult(false, "ID uploaded! Pending admin review.");
            }

            String text = candidates.get(0)
                .path("content")
                .path("parts").get(0)
                .path("text").asText("");

            log.info("Gemini raw response for user {}: {}", userId, text);

            // Extract JSON from response
            int start = text.indexOf('{');
            int end   = text.lastIndexOf('}') + 1;

            if (start == -1 || end <= start) {
                log.error("No JSON found in Gemini response: {}", text);
                return new VerificationResult(false, "ID uploaded! Pending admin review.");
            }

            String jsonPart = text.substring(start, end);
            JsonNode result = objectMapper.readTree(jsonPart);

            boolean approved   = result.path("approved").asBoolean(false);
            String  confidence = result.path("confidence").asText("LOW");
            String  reason     = result.path("reason").asText("No reason provided");

            log.info("Verification result for user {}: approved={}, confidence={}, reason={}",
                userId, approved, confidence, reason);

            if (approved) {
                // Auto verify — HIGH or MEDIUM confidence
                user.setIsCollegeVerified(true);
                userRepository.save(user);
                log.info("✅ Auto-verified college ID for user {}", userId);
                return new VerificationResult(true,
                    "✅ College ID verified automatically! You can now book and offer rides.");
            } else {
                log.info("❌ ID rejected for user {}: {}", userId, reason);
                return new VerificationResult(false,
                    "❌ Could not verify ID: " + reason + ". Please upload a clearer photo of your college ID card.");
            }

        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {} — body: {}", e.getMessage(), responseBody);
            return new VerificationResult(false, "ID uploaded! Pending admin review.");
        }
    }

    private String detectMimeType(String filePath) {
        String lower = filePath.toLowerCase();
        if (lower.endsWith(".png"))  return "image/png";
        if (lower.endsWith(".gif"))  return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        return "image/jpeg"; // default
    }

    public record VerificationResult(boolean approved, String message) {}
}