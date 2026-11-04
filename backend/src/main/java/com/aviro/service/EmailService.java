package com.aviro.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.internet.MimeMessage;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Value("${spring.mail.username:}")
    private String mailUsername;

    // Brevo (brevo.com) sends over HTTPS; empty key = use SMTP
    @Value("${aviro.mail.brevo-api-key:}")
    private String brevoApiKey;

    @Value("${aviro.mail.brevo-api-url:https://api.brevo.com/v3/smtp/email}")
    private String brevoApiUrl;

    // Sender address (must be verified in Brevo); defaults to the SMTP username
    @Value("${aviro.mail.from:}")
    private String mailFrom;

    @Value("${aviro.mail.from-name:AVIRO}")
    private String mailFromName;

    // ============================================================
    // VERIFICATION OTP
    // ============================================================
    @Async("taskExecutor")
    public void sendVerificationEmail(
            String to,
            String name,
            String otp
    ) {

        String subject =
                "🚀 Verify your AVIRO account";

        String body = buildEmailHtml(
                name,
                "Welcome to AVIRO! 🎓",
                "Your email verification OTP is:",
                otp,
                "This OTP expires in 10 minutes. Don't share it with anyone."
        );

        sendEmail(to, subject, body);
    }

    // ============================================================
    // PASSWORD RESET OTP
    // ============================================================
    @Async("taskExecutor")
    public void sendPasswordResetEmail(
            String to,
            String name,
            String otp
    ) {

        String subject =
                "🔐 AVIRO Password Reset OTP";

        String body = buildEmailHtml(
                name,
                "Password Reset Request",
                "Your password reset OTP is:",
                otp,
                "If you didn't request this, ignore this email. OTP expires in 10 minutes."
        );

        sendEmail(to, subject, body);
    }

    // Sent right away (not in the background) so the app can tell the user if it failed
    public boolean sendPasswordResetEmailNow(String to, String name, String otp) {
        return sendEmail(to, "🔐 Your AVIRO password reset code", buildEmailHtml(
                name,
                "Reset your password",
                "Your password reset code is:",
                otp,
                "It expires in 10 minutes. If you didn't ask to reset your password, you can ignore this email."
        ));
    }

    // ============================================================
    // BOOKING CONFIRMATION
    // ============================================================
    @Async("taskExecutor")
    public void sendBookingConfirmation(
            String to,
            String name,
            String rideDetails
    ) {

        String subject =
                "✅ Ride Booking Confirmed - AVIRO";

        String body =
                "<html><body style='font-family:sans-serif;"
                        + "background:#0D0F14;color:#F0F2F8;padding:24px'>"

                        + "<h2 style='color:#FF6B2B'>Hi "
                        + name
                        + "!</h2>"

                        + "<p>Your ride has been "
                        + "<strong style='color:#22C55E'>confirmed</strong>."
                        + "</p>"

                        + "<div style='background:#161A22;"
                        + "border-radius:12px;padding:16px;margin:16px 0'>"
                        + rideDetails
                        + "</div>"

                        + "<p style='color:#8B93A8'>"
                        + "Have a safe ride! 🏍️"
                        + "<br/>Team AVIRO"
                        + "</p>"

                        + "</body></html>";

        sendEmail(to, subject, body);
    }

    // ============================================================
    // RIDE REQUEST
    // ============================================================
    @Async("taskExecutor")
    public void sendRideRequestNotification(
            String to,
            String driverName,
            String riderName
    ) {

        String subject =
                "🙋 New Ride Request - AVIRO";

        String body =
                "<html><body style='font-family:sans-serif;padding:24px'>"

                        + "<h2 style='color:#FF6B2B'>New Request!</h2>"

                        + "<p>Hi "
                        + driverName
                        + ", <strong>"
                        + riderName
                        + "</strong> wants to join your ride.</p>"

                        + "<p>Open the AVIRO app to accept or decline.</p>"

                        + "<p style='color:#8B93A8'>"
                        + "Team AVIRO 🚀"
                        + "</p>"

                        + "</body></html>";

        sendEmail(to, subject, body);
    }

    // ============================================================
    // SOS ALERT
    // ============================================================
    // Names and messages come from users, so they are escaped before going into the HTML
    @Async("taskExecutor")
    public void sendSosAlert(String toEmail, String senderName, String message, String mapsLink, String tripLink) {
        String subject = "🆘 SOS: " + senderName + " needs help";
        String body = "<html><body style='font-family:sans-serif;background:#1a1a2e;color:white;padding:30px'>"
                + "<div style='max-width:500px;margin:0 auto;background:#0f0f1a;border-radius:16px;padding:30px;border:2px solid #ef4444'>"
                + "<h1 style='color:#ef4444;text-align:center'>🆘 SOS ALERT</h1>"
                + "<p style='font-size:18px;color:#fbbf24;text-align:center'><strong>" + esc(senderName) + " needs help</strong></p>"
                + "<div style='background:#1a1a2e;padding:20px;border-radius:12px;margin:20px 0;border:1px solid #ef4444'>"
                + "<pre style='color:#f97316;font-size:15px;white-space:pre-wrap;font-family:sans-serif'>" + esc(message) + "</pre>"
                + "</div>"
                + button(mapsLink, "📍 Open their location", "#ef4444")
                + button(tripLink, "🚗 Follow the trip live", "#FF6B2B")
                + "<p style='color:#ef4444;font-size:20px;font-weight:bold;text-align:center'>Emergency: call 112</p>"
                + "<hr style='border-color:#333;margin:20px 0'/>"
                + "<p style='color:#666;font-size:12px;text-align:center'>You are getting this because "
                + esc(senderName) + " saved you as an emergency contact on AVIRO.</p>"
                + "</div></body></html>";
        sendEmail(toEmail, subject, body);
    }

    // ============================================================
    // RIDE SHARE ALERT
    // ============================================================
    @Async("taskExecutor")
    public void sendRideShareAlert(String toEmail, String senderName, String message, String link) {
        String subject = "📍 " + senderName + " shared their AVIRO trip with you";
        String body = "<html><body style='font-family:sans-serif;background:#0D0F14;color:#F0F2F8;padding:24px'>"
                + "<div style='max-width:500px;margin:0 auto;background:#161A22;border-radius:16px;padding:28px;border:1px solid #2A2F3E'>"
                + "<h1 style='color:#FF6B2B'>aviro</h1>"
                + "<h2 style='color:#22c55e'>📍 Follow " + esc(senderName) + "'s trip</h2>"
                + "<pre style='color:#F0F2F8;font-size:15px;white-space:pre-wrap;font-family:sans-serif'>" + esc(message) + "</pre>"
                + button(link, "Open the live trip", "#FF6B2B")
                + "<p style='color:#8B93A8;font-size:12px;text-align:center'>Sent via AVIRO, Pune's college ride sharing</p>"
                + "</div></body></html>";
        sendEmail(toEmail, subject, body);
    }

    // ============================================================
    // ADMIN ALERT
    // ============================================================
    @Async("taskExecutor")
    public void sendAdminAlert(String subject, String alertBody) {
        String body = "<html><body style='font-family:sans-serif;padding:24px'>"
                + "<h2 style='color:#ef4444'>" + esc(subject) + "</h2>"
                + "<div style='background:#f5f5f5;padding:20px;border-radius:8px;margin:16px 0'>"
                + "<pre style='font-size:14px;white-space:pre-wrap'>" + esc(alertBody) + "</pre>"
                + "</div>"
                + "<p style='color:#666;font-size:12px'>AVIRO Admin Alert System</p>"
                + "</body></html>";
        sendEmail("sahilshaikh34088@gmail.com", subject, body);
    }

    private static String esc(String text) {
        return text == null ? "" : HtmlUtils.htmlEscape(text);
    }

    // A big tappable link; nothing when there is no link
    private static String button(String href, String label, String color) {
        if (href == null || href.isBlank()) return "";
        return "<p style='text-align:center;margin:18px 0'><a href='" + esc(href) + "' style='display:inline-block;background:"
                + color + ";color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:12px'>"
                + esc(label) + "</a></p>";
    }

    // ============================================================
    // COMMON EMAIL METHOD
    // ============================================================
    private boolean sendEmail(
            String to,
            String subject,
            String htmlBody
    ) {
        // Render's free plan blocks SMTP ports, so use Brevo's HTTPS API when a key is set
        return StringUtils.hasText(brevoApiKey)
                ? sendViaBrevo(to, subject, htmlBody)
                : sendViaSmtp(to, subject, htmlBody);
    }

    private boolean sendViaBrevo(String to, String subject, String htmlBody) {
        try {
            String json = objectMapper.writeValueAsString(Map.of(
                    "sender", Map.of("name", mailFromName, "email", fromAddress()),
                    "to", List.of(Map.of("email", to)),
                    "subject", subject,
                    "htmlContent", htmlBody
            ));
            HttpRequest request = HttpRequest.newBuilder(URI.create(brevoApiUrl))
                    .timeout(Duration.ofSeconds(15))
                    .header("api-key", brevoApiKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 == 2) {
                log.info("Email sent to {} via Brevo", to);
                return true;
            }
            log.error("Brevo refused email to {}: {} {}", to, response.statusCode(), response.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Email to {} interrupted", to);
        } catch (Exception e) {
            log.error("EMAIL FAILED TO: {}", to, e);
        }
        return false;
    }

    private boolean sendViaSmtp(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            helper.setFrom(fromAddress(), mailFromName);
            mailSender.send(message);
            log.info("Email sent to {} via SMTP", to);
            return true;
        } catch (Exception e) {
            log.error("EMAIL FAILED TO: {}", to, e);
            return false;
        }
    }

    private String fromAddress() {
        return StringUtils.hasText(mailFrom) ? mailFrom : mailUsername;
    }

    // ============================================================
    // OTP HTML
    // ============================================================
    private String buildEmailHtml(
            String name,
            String heading,
            String bodyText,
            String otp,
            String footer
    ) {

        return """
            <html>
            <body style='font-family:sans-serif;
                         background:#0D0F14;
                         color:#F0F2F8;
                         padding:32px;
                         margin:0'>

            <div style='max-width:480px;
                        margin:0 auto;
                        background:#161A22;
                        border-radius:20px;
                        padding:32px;
                        border:1px solid #2A2F3E'>

              <h1 style='color:#FF6B2B;
                         font-size:24px;
                         margin:0 0 8px'>
                AVIRO 🚀
              </h1>

              <p style='color:#8B93A8;
                        margin:0 0 24px;
                        font-size:13px'>
                Affordable Verified Intelligent Ride Organizer
              </p>

              <h2 style='color:#F0F2F8;
                         font-size:18px'>
                Hi %s, %s
              </h2>

              <p style='color:#8B93A8'>
                %s
              </p>

              <div style='background:#0D0F14;
                          border-radius:12px;
                          padding:20px;
                          text-align:center;
                          margin:24px 0;
                          border:1px solid #2A2F3E'>

                <span style='font-size:36px;
                             font-weight:800;
                             letter-spacing:8px;
                             color:#FF6B2B'>
                  %s
                </span>

              </div>

              <p style='color:#8B93A8;
                        font-size:12px'>
                %s
              </p>

              <hr style='border-color:#2A2F3E;
                         margin:24px 0'>

              <p style='color:#8B93A8;
                        font-size:11px;
                        text-align:center'>
                © 2025 AVIRO · Pune's College Ride Platform
              </p>

            </div>

            </body>
            </html>
            """.formatted(
                name,
                heading,
                bodyText,
                otp,
                footer
        );
    }
}
