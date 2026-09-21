package com.aviro.service;

import jakarta.mail.internet.MimeMessage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String mailUsername;

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
    @Async("taskExecutor")
    public void sendSosAlert(
            String toEmail,
            String senderName,
            String message
    ) {

        String subject =
                "🆘 SOS EMERGENCY ALERT - "
                        + senderName
                        + " needs help!";

        String body =
                "<html><body style='font-family:sans-serif;"
                        + "background:#1a1a2e;color:white;padding:30px'>"

                        + "<div style='max-width:500px;margin:0 auto;"
                        + "background:#0f0f1a;border-radius:16px;"
                        + "padding:30px;border:2px solid #ef4444'>"

                        + "<h1 style='color:#ef4444;text-align:center'>"
                        + "🆘 SOS EMERGENCY ALERT"
                        + "</h1>"

                        + "<p style='font-size:18px;color:#fbbf24;"
                        + "text-align:center'>"

                        + "<strong>"
                        + senderName
                        + " needs immediate help!"
                        + "</strong>"

                        + "</p>"

                        + "<div style='background:#1a1a2e;padding:20px;"
                        + "border-radius:12px;margin:20px 0;"
                        + "border:1px solid #ef4444'>"

                        + "<pre style='color:#f97316;font-size:15px;"
                        + "white-space:pre-wrap'>"
                        + message
                        + "</pre>"

                        + "</div>"

                        + "<p style='color:#ef4444;font-size:22px;"
                        + "font-weight:bold;text-align:center'>"
                        + "Please call 112 if needed!"
                        + "</p>"

                        + "<hr style='border-color:#333;margin:20px 0'/>"

                        + "<p style='color:#666;font-size:12px;"
                        + "text-align:center'>"
                        + "Automated emergency alert from AVIRO - "
                        + "Pune's College Ride Platform"
                        + "</p>"

                        + "</div></body></html>";

        sendEmail(toEmail, subject, body);
    }

    // ============================================================
    // RIDE SHARE ALERT
    // ============================================================
    @Async("taskExecutor")
    public void sendRideShareAlert(
            String toEmail,
            String senderName,
            String message
    ) {

        String subject =
                "📍 "
                        + senderName
                        + " shared their AVIRO ride with you";

        String body =
                "<html><body style='font-family:sans-serif;"
                        + "background:#0D0F14;color:#F0F2F8;padding:24px'>"

                        + "<div style='max-width:500px;margin:0 auto;"
                        + "background:#161A22;border-radius:16px;"
                        + "padding:28px;border:1px solid #2A2F3E'>"

                        + "<h1 style='color:#FF6B2B'>AVIRO 🚀</h1>"

                        + "<h2 style='color:#22c55e'>"
                        + "📍 Live Ride Tracking"
                        + "</h2>"

                        + "<p style='color:#8B93A8'>"
                        + senderName
                        + " has shared their ride details with you for safety."
                        + "</p>"

                        + "<div style='background:#0D0F14;padding:20px;"
                        + "border-radius:12px;margin:20px 0;"
                        + "border:1px solid #2A2F3E'>"

                        + "<pre style='color:#22c55e;font-size:14px;"
                        + "white-space:pre-wrap'>"
                        + message
                        + "</pre>"

                        + "</div>"

                        + "<p style='color:#8B93A8;font-size:12px;"
                        + "text-align:center'>"
                        + "Sent via AVIRO - Pune's College Ride Sharing"
                        + "</p>"

                        + "</div></body></html>";

        sendEmail(toEmail, subject, body);
    }

    // ============================================================
    // ADMIN ALERT
    // ============================================================
    @Async("taskExecutor")
    public void sendAdminAlert(
            String subject,
            String alertBody
    ) {

        String body =
                "<html><body style='font-family:sans-serif;padding:24px'>"

                        + "<h2 style='color:#ef4444'>"
                        + subject
                        + "</h2>"

                        + "<div style='background:#f5f5f5;padding:20px;"
                        + "border-radius:8px;margin:16px 0'>"

                        + "<pre style='font-size:14px;"
                        + "white-space:pre-wrap'>"
                        + alertBody
                        + "</pre>"

                        + "</div>"

                        + "<p style='color:#666;font-size:12px'>"
                        + "AVIRO Admin Alert System"
                        + "</p>"

                        + "</body></html>";

        sendEmail(
                "sahilshaikh34088@gmail.com",
                subject,
                body
        );
    }

    // ============================================================
    // COMMON EMAIL METHOD
    // ============================================================
    private void sendEmail(
            String to,
            String subject,
            String htmlBody
    ) {

        try {

            log.info(
                    "Starting email send to: {}",
                    to
            );

            MimeMessage message =
                    mailSender.createMimeMessage();

            MimeMessageHelper helper =
                    new MimeMessageHelper(
                            message,
                            true,
                            "UTF-8"
                    );

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            // Use authenticated Gmail account
            helper.setFrom(mailUsername);

            mailSender.send(message);

            log.info(
                    "EMAIL SENT SUCCESSFULLY TO: {}",
                    to
            );

        } catch (Exception e) {

            log.error(
                    "EMAIL FAILED TO: {}",
                    to,
                    e
            );
        }
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
