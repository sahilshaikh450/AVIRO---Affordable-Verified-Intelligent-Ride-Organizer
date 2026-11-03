package com.aviro.service;

import com.aviro.entity.DuesPayment;
import com.aviro.entity.User;
import com.aviro.enums.DuesPaymentStatus;
import com.aviro.exception.AviroException;
import com.aviro.repository.BookingRepository;
import com.aviro.repository.DuesPaymentRepository;
import com.aviro.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * AVIRO's fee on each completed booking. Riders pay drivers directly (UPI or cash), so the fee
 * is added to the driver's dues; the driver pays the platform's UPI ID and an admin confirms it.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DuesService {

    private final BookingRepository bookingRepository;
    private final DuesPaymentRepository duesPaymentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Value("${aviro.fees.per-seat:3}")
    private double feePerSeat;

    // Above this unpaid amount a driver can't post new rides
    @Value("${aviro.fees.dues-limit:50}")
    private double duesLimit;

    // Where drivers pay their dues; empty until the owner sets AVIRO_FEE_UPI_ID
    @Value("${aviro.fees.upi-id:}")
    private String platformUpiId;

    @Value("${aviro.fees.upi-name:AVIRO}")
    private String platformUpiName;

    public double feeFor(int seats) {
        return round(feePerSeat * seats);
    }

    public record Summary(double feePerSeat, double totalFees, double paid, double awaitingConfirmation,
                          double due, double limit, boolean blocked, String upiId, String upiName,
                          List<Map<String, Object>> payments) {}

    public Summary summaryFor(Long driverId) {
        double total = round(bookingRepository.totalPlatformFeesForDriver(driverId));
        double paid = round(duesPaymentRepository.sumByDriverAndStatus(driverId, DuesPaymentStatus.CONFIRMED));
        double pending = round(duesPaymentRepository.sumByDriverAndStatus(driverId, DuesPaymentStatus.PENDING));
        // A payment waiting for the admin already counts, so the driver isn't blocked meanwhile
        double due = round(Math.max(0, total - paid - pending));
        List<Map<String, Object>> payments = duesPaymentRepository.findTop10ByDriverIdOrderByCreatedAtDesc(driverId)
                .stream().map(DuesService::toMap).toList();
        return new Summary(feePerSeat, total, paid, pending, due, duesLimit, due > duesLimit,
                platformUpiId, platformUpiName, payments);
    }

    public void requireCanPost(Long driverId) {
        Summary s = summaryFor(driverId);
        if (s.blocked()) {
            throw new AviroException("💳 Please clear your AVIRO dues of ₹" + fmt(s.due())
                    + " in Profile to post new rides.");
        }
    }

    @Transactional
    public Summary submitPayment(String driverEmail, Double amount, String reference) {
        User driver = userRepository.findByEmail(driverEmail)
                .orElseThrow(() -> new AviroException("User not found"));
        Summary s = summaryFor(driver.getId());
        if (amount == null || amount < 1) {
            throw new AviroException("Enter the amount you paid");
        }
        if (amount > s.due() + 0.001) {
            throw new AviroException("You owe ₹" + fmt(s.due()) + ". Please don't pay more than that.");
        }
        String ref = reference == null || reference.isBlank() ? null : reference.trim();
        if (ref != null && ref.length() > 64) ref = ref.substring(0, 64);
        duesPaymentRepository.save(DuesPayment.builder().driver(driver).amount(round(amount)).reference(ref).build());
        log.info("Dues payment of {} submitted by driver {}", amount, driver.getId());
        return summaryFor(driver.getId());
    }

    public List<Map<String, Object>> pendingForAdmin() {
        return duesPaymentRepository.findByStatusWithDriver(DuesPaymentStatus.PENDING).stream().map(p -> {
            Map<String, Object> m = toMap(p);
            m.put("driverId", p.getDriver().getId());
            m.put("driverName", p.getDriver().getFullName());
            m.put("driverEmail", p.getDriver().getEmail());
            return m;
        }).toList();
    }

    @Transactional
    public void decide(Long paymentId, boolean confirmed) {
        DuesPayment p = duesPaymentRepository.findById(paymentId)
                .orElseThrow(() -> new AviroException("Payment not found"));
        if (p.getStatus() != DuesPaymentStatus.PENDING) {
            throw new AviroException("This payment was already " + p.getStatus().name().toLowerCase());
        }
        p.setStatus(confirmed ? DuesPaymentStatus.CONFIRMED : DuesPaymentStatus.REJECTED);
        duesPaymentRepository.save(p);
        try {
            notificationService.send(p.getDriver().getId(),
                    confirmed ? "Dues payment received ✅" : "Dues payment not found",
                    confirmed
                            ? "We received your ₹" + fmt(p.getAmount()) + " AVIRO fee payment. Thank you!"
                            : "We couldn't find your ₹" + fmt(p.getAmount()) + " payment. Please check the UPI transaction ID and submit again.",
                    "VERIFICATION", null);
        } catch (Exception e) {
            log.warn("Dues notification failed: {}", e.getMessage());
        }
    }

    private static Map<String, Object> toMap(DuesPayment p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("amount", p.getAmount());
        m.put("reference", p.getReference());
        m.put("status", p.getStatus());
        m.put("createdAt", p.getCreatedAt());
        return m;
    }

    private static double round(Double v) {
        return v == null ? 0 : Math.round(v * 100.0) / 100.0;
    }

    private static String fmt(double v) {
        return v == Math.floor(v) ? String.valueOf((long) v) : String.format("%.2f", v);
    }
}
