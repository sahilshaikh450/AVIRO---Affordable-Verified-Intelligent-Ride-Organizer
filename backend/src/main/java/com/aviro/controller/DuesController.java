package com.aviro.controller;

import com.aviro.dto.response.ApiResponse;
import com.aviro.exception.AviroException;
import com.aviro.repository.UserRepository;
import com.aviro.service.DuesService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// A driver's AVIRO fee balance, and paying it
@RestController
@RequestMapping("/dues")
@RequiredArgsConstructor
public class DuesController {

    private final DuesService duesService;
    private final UserRepository userRepository;

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<DuesService.Summary>> myDues(@AuthenticationPrincipal UserDetails userDetails) {
        Long id = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new AviroException("User not found")).getId();
        return ResponseEntity.ok(ApiResponse.success(duesService.summaryFor(id)));
    }

    @PostMapping("/payments")
    public ResponseEntity<ApiResponse<DuesService.Summary>> submitPayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {
        Object amount = body.get("amount");
        Double value;
        try {
            value = amount == null ? null : Double.valueOf(amount.toString());
        } catch (NumberFormatException e) {
            throw new AviroException("Enter the amount you paid");
        }
        Object ref = body.get("reference");
        return ResponseEntity.ok(ApiResponse.success("Payment submitted. We'll confirm it soon.",
                duesService.submitPayment(userDetails.getUsername(), value, ref == null ? null : ref.toString())));
    }
}
