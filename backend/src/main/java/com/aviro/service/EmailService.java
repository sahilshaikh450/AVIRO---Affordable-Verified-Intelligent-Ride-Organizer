package com.aviro.service;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.mail.internet.MimeMessage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${aviro.mail.brevo-api-key:}")
    private String brevoApiKey;

    @Value("${aviro.mail.brevo-api-url:https://api.brevo.com/v3/smtp/email}")
    private String brevoApiUrl;

    @Value("${aviro.mail.from:}")
    private String mailFrom;

    @Value("${aviro.mail.from-name:AVIRO}")
    private String mailFromName;

    @Value("${aviro.frontend-url:https://aviro-affordable-verified-intellige.vercel.app}")
    private String frontendUrl;

    public boolean sendVerificationEmailNow(String to, String name, String otp) {
        return sendEmail(
                to,
                "Your AVIRO verification code: " + otp,
                codeEmail(
                        name,
                        "Verify your email",
                        "enter this code in AVIRO to finish creating your account.",
                        otp,
                        "The code expires in 10 minutes. Never share it with anyone, not even AVIRO"
                            + " staff."));
    }

    @Async("taskExecutor")
    public void sendVerificationEmail(String to, String name, String otp) {
        sendEmail(
                to,
                "Your AVIRO verification code: " + otp,
                codeEmail(
                        name,
                        "Verify your college email",
                        "enter this code in AVIRO to confirm this email address.",
                        otp,
                        "The code expires in 10 minutes. Never share it with anyone."));
    }

    public boolean sendPasswordResetEmailNow(String to, String name, String otp) {
        return sendEmail(
                to,
                "Your AVIRO password reset code: " + otp,
                codeEmail(
                        name,
                        "Reset your password",
                        "enter this code in AVIRO to choose a new password.",
                        otp,
                        "It expires in 10 minutes. If you didn't ask to reset your password, you"
                            + " can ignore this email."));
    }

    @Async("taskExecutor")
    public void sendBookingConfirmation(String to, String name, String rideDetails) {
        String content =
                heading("Your seat is confirmed")
                        + para("Hi " + esc(firstName(name)) + ", the driver accepted your booking.")
                        + panel(
                                "<p style='margin:0;font-size:12px;color:"
                                        + MUTED
                                        + ";text-transform:uppercase;letter-spacing:1px'>Trip</p><p"
                                        + " style='margin:6px 0"
                                        + " 0;font-size:16px;font-weight:600;color:"
                                        + INK
                                        + "'>"
                                        + esc(rideDetails)
                                        + "</p>")
                        + para(
                                "Open the app to see pickup details, chat with your driver and"
                                    + " track the trip live.")
                        + button(frontendUrl + "/bookings", "View booking", INK);
        sendEmail(
                to,
                "Booking confirmed: " + rideDetails,
                layout("Your AVIRO seat is confirmed", content));
    }

    @Async("taskExecutor")
    public void sendRideRequestNotification(String to, String driverName, String riderName) {
        String content =
                heading("New ride request")
                        + para(
                                "Hi "
                                        + esc(firstName(driverName))
                                        + ", <strong style='color:"
                                        + INK
                                        + "'>"
                                        + esc(riderName)
                                        + "</strong> wants to join your ride.")
                        + para(
                                "Accept or decline it in the app. The rider is waiting for your"
                                    + " answer.")
                        + button(frontendUrl + "/my-rides", "Review request", INK);
        sendEmail(
                to,
                "New ride request from " + riderName,
                layout(riderName + " wants to join your ride", content));
    }

    @Async("taskExecutor")
    public void sendSosAlert(
            String toEmail, String senderName, String message, String mapsLink, String tripLink) {
        String content =
                "<p style='margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:2px;color:"
                        + DANGER
                        + "'>SOS ALERT</p>"
                        + heading(esc(senderName) + " needs help")
                        + panel(
                                "<pre style='margin:0;font-size:14px;line-height:1.5;white-space:pre-wrap;font-family:inherit;color:"
                                        + INK
                                        + "'>"
                                        + esc(message)
                                        + "</pre>",
                                DANGER)
                        + button(mapsLink, "Open their location", DANGER)
                        + button(tripLink, "Follow the trip live", INK)
                        + "<p style='margin:20px 0"
                        + " 0;text-align:center;font-size:18px;font-weight:700;color:"
                        + DANGER
                        + "'>Emergency? Call 112</p>"
                        + small(
                                "You are getting this because "
                                        + esc(senderName)
                                        + " saved you as an emergency contact on AVIRO.");
        sendEmail(
                toEmail,
                "SOS: " + senderName + " needs help",
                layout(senderName + " pressed SOS on AVIRO", content));
    }

    @Async("taskExecutor")
    public void sendRideShareAlert(String toEmail, String senderName, String message, String link) {
        String content =
                heading("Follow " + esc(senderName) + "'s trip")
                        + panel(
                                "<pre style='margin:0;font-size:14px;line-height:1.5;white-space:pre-wrap;font-family:inherit;color:"
                                        + INK
                                        + "'>"
                                        + esc(message)
                                        + "</pre>")
                        + button(link, "Open the live trip", INK)
                        + small(
                                "The link works without an account and stops working when the trip"
                                    + " ends.");
        sendEmail(
                toEmail,
                senderName + " shared their AVIRO trip with you",
                layout("Follow " + senderName + "'s trip live", content));
    }

    @Async("taskExecutor")
    public void sendAdminAlert(String subject, String alertBody) {
        String content =
                heading(esc(subject))
                        + panel(
                                "<pre style='margin:0;font-size:13px;line-height:1.5;white-space:pre-wrap;font-family:inherit;color:"
                                        + INK
                                        + "'>"
                                        + esc(alertBody)
                                        + "</pre>")
                        + button(frontendUrl + "/admin", "Open admin panel", INK);
        sendEmail("sahilshaikh34088@gmail.com", subject, layout(subject, content));
    }

    private static final String INK = "#111111";
    private static final String MUTED = "#6B6B6B";
    private static final String LINE = "#E6E6E6";
    private static final String SOFT = "#F5F5F5";
    private static final String DANGER = "#D93025";
    private static final String FONT =
            "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif";

    private String layout(String preheader, String content) {
        int year = java.time.Year.now(java.time.ZoneId.of("Asia/Kolkata")).getValue();
        return "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport'"
                   + " content='width=device-width,initial-scale=1'></head><body"
                   + " style='margin:0;padding:0;background:"
                + SOFT
                + ";font-family:"
                + FONT
                + "'>"
                + "<div style='display:none;max-height:0;overflow:hidden;opacity:0'>"
                + esc(preheader)
                + "</div><table role='presentation' width='100%' cellpadding='0' cellspacing='0'"
                + " style='background:"
                + SOFT
                + ";padding:32px 12px'><tr><td align='center'><table role='presentation'"
                + " width='100%' cellpadding='0' cellspacing='0'"
                + " style='max-width:480px;background:#FFFFFF;border:1px solid "
                + LINE
                + ";border-radius:16px'>"
                + "<tr><td style='padding:28px 28px 0'>"
                + "<p style='margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;color:"
                + INK
                + "'>aviro</p><p style='margin:2px 0"
                + " 0;font-size:10px;font-weight:600;letter-spacing:3px;color:"
                + MUTED
                + "'>PUNE &middot; RIDE &middot; SHARE</p>"
                + "</td></tr>"
                + "<tr><td style='padding:24px 28px 28px'>"
                + content
                + "</td></tr>"
                + "<tr><td style='padding:16px 28px;border-top:1px solid "
                + LINE
                + "'>"
                + "<p style='margin:0;font-size:11px;line-height:1.5;color:"
                + MUTED
                + ";text-align:center'>&copy; "
                + year
                + " AVIRO &middot; Pune's college ride network<br>Verified students only &middot;"
                + " <a href='"
                + esc(frontendUrl)
                + "' style='color:"
                + MUTED
                + "'>Open AVIRO</a></p>"
                + "</td></tr></table></td></tr></table></body></html>";
    }

    private String codeEmail(String name, String title, String intro, String otp, String footnote) {
        String content =
                heading(title)
                        + para("Hi " + esc(firstName(name)) + ", " + esc(intro))
                        + "<div style='margin:20px 0;padding:20px;background:"
                        + INK
                        + ";border-radius:12px;text-align:center'><span"
                        + " style='font-size:34px;font-weight:800;letter-spacing:10px;color:#FFFFFF;font-family:Menlo,Consolas,monospace'>"
                        + esc(otp)
                        + "</span></div>"
                        + small(esc(footnote));
        return layout(title + ": your code is " + otp, content);
    }

    private static String heading(String html) {
        return "<h1 style='margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:"
                + INK
                + "'>"
                + html
                + "</h1>";
    }

    private static String para(String html) {
        return "<p style='margin:0 0 14px;font-size:15px;line-height:1.55;color:#333333'>"
                + html
                + "</p>";
    }

    private static String small(String html) {
        return "<p style='margin:16px 0 0;font-size:12px;line-height:1.5;color:"
                + MUTED
                + "'>"
                + html
                + "</p>";
    }

    private static String panel(String html) {
        return panel(html, LINE);
    }

    private static String panel(String html, String border) {
        return "<div style='margin:16px 0;padding:16px;background:"
                + SOFT
                + ";border:1px solid "
                + border
                + ";border-radius:12px'>"
                + html
                + "</div>";
    }

    private static String firstName(String name) {
        if (name == null || name.isBlank()) return "there";
        return name.trim().split("\\s+")[0];
    }

    private static String esc(String text) {
        return text == null ? "" : HtmlUtils.htmlEscape(text);
    }

    private static String button(String href, String label, String color) {
        if (href == null || href.isBlank()) return "";
        return "<p style='text-align:center;margin:20px 0 4px'><a href='"
                + esc(href)
                + "' style='display:inline-block;background:"
                + color
                + ";color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:13px"
                + " 26px;border-radius:999px'>"
                + esc(label)
                + "</a></p>";
    }

    private boolean sendEmail(String to, String subject, String htmlBody) {
        return StringUtils.hasText(brevoApiKey)
                ? sendViaBrevo(to, subject, htmlBody)
                : sendViaSmtp(to, subject, htmlBody);
    }

    private boolean sendViaBrevo(String to, String subject, String htmlBody) {
        try {
            String json =
                    objectMapper.writeValueAsString(
                            Map.of(
                                    "sender",
                                    Map.of("name", mailFromName, "email", fromAddress()),
                                    "to",
                                    List.of(Map.of("email", to)),
                                    "subject",
                                    subject,
                                    "htmlContent",
                                    htmlBody));
            HttpRequest request =
                    HttpRequest.newBuilder(URI.create(brevoApiUrl))
                            .timeout(Duration.ofSeconds(15))
                            .header("api-key", brevoApiKey)
                            .header("Content-Type", "application/json")
                            .header("Accept", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(json))
                            .build();
            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 == 2) {
                log.info("Email sent to {} via Brevo", to);
                return true;
            }
            log.error(
                    "Brevo refused email to {}: {} {}", to, response.statusCode(), response.body());
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
}
