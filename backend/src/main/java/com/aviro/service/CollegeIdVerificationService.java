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

            if (geminiApiKey == null || geminiApiKey.isEmpty()) {
                log.warn("Gemini API key not set — skipping AI verification");
                return new VerificationResult(false, "AI verification unavailable. Admin will review manually.");
            }

            // Read image file
            Path filePath = Paths.get(imagePath);
            if (!Files.exists(filePath)) {
                return new VerificationResult(false, "Image file not found");
            }

            byte[] imageBytes = Files.readAllBytes(filePath);
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            String mimeType = detectMimeType(filePath.toString());

            // Build Gemini API request
            String prompt = buildPrompt(user.getCollegeName());
            String requestBody = """
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
                """.formatted(mimeType, base64Image,
                    objectMapper.valueToTree(prompt).toString());

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GEMINI_API_URL + geminiApiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = client.send(request,
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Gemini API error: {} {}", response.statusCode(), response.body());
                return new VerificationResult(false,
                        "AI verification failed. Admin will review manually.");
            }

            return parseGeminiResponse(response.body(), userId);

        } catch (Exception e) {
            log.error("ID verification error for user {}: {}", userId, e.getMessage());
            return new VerificationResult(false, "Verification error: " + e.getMessage());
        }
    }

    private String buildPrompt(String collegeName) {
        return """
            You are a college ID verification system for AVIRO, a ride-sharing app for Pune college students.
            
            Analyze this image and determine if it is a valid Indian college/university student ID card.
            
            Check for:
            1. Is this a student ID card / college identity card?
            2. Does it have a student name?
            3. Does it have a college/institution name?
            4. Does it have a student ID/enrollment number?
            5. Does it have a student photo?
            6. Is it from an Indian educational institution?
            
            Student claims to be from: %s
            
            RULES:
            - APPROVE if it looks like a genuine college student ID card
            - REJECT if it's NOT a student ID (Aadhaar, PAN, driving license, random photo, blank)
            - REJECT if image is too blurry or unreadable
            - Be lenient — partial visibility is okay if it's clearly a college ID
            
            Reply ONLY in this JSON format (no other text):
            {"approved": true, "confidence": "HIGH", "reason": "Valid college ID card detected"}
            """.formatted(collegeName != null ? collegeName : "a Pune college");
    }

    private VerificationResult parseGeminiResponse(String responseBody, Long userId) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String text = root
                    .path("candidates").get(0)
                    .path("content")
                    .path("parts").get(0)
                    .path("text").asText();

            log.info("Gemini response for user {}: {}", userId, text);

            // Extract JSON
            int start = text.indexOf('{');
            int end   = text.lastIndexOf('}') + 1;
            if (start == -1 || end == 0) {
                return new VerificationResult(false, "Could not parse AI response");
            }

            JsonNode result    = objectMapper.readTree(text.substring(start, end));
            boolean  approved  = result.path("approved").asBoolean(false);
            String   confidence = result.path("confidence").asText("LOW");
            String   reason    = result.path("reason").asText("No reason");

            if (approved && ("HIGH".equals(confidence) || "MEDIUM".equals(confidence))) {
                // Auto verify!
                User user = userRepository.findById(userId).orElseThrow();
                user.setIsCollegeVerified(true);
                userRepository.save(user);
                log.info("✅ Auto-verified college ID for user {}", userId);
                return new VerificationResult(true,
                        "✅ College ID verified automatically! You can now book and offer rides.");
            } else if (approved) {
                // Low confidence — manual review
                return new VerificationResult(false,
                        "ID uploaded. Pending manual admin review.");
            } else {
                return new VerificationResult(false, "❌ Invalid ID: " + reason);
            }

        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", e.getMessage());
            return new VerificationResult(false, "Verification parsing failed");
        }
    }

    private String detectMimeType(String filePath) {
        String lower = filePath.toLowerCase();
        if (lower.endsWith(".png"))  return "image/png";
        if (lower.endsWith(".gif"))  return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
    }

    public record VerificationResult(boolean approved, String message) {}
}