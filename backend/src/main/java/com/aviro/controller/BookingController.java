package com.aviro.controller;
import java.util.Map; 
import com.aviro.dto.request.BookingRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.BookingResponse;
import com.aviro.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

 // ============================================================
 // ADD THIS ONE METHOD to your existing BookingController.java
 // (paste it anywhere inside the class, alongside other @PatchMapping methods)
 // ============================================================

 //import java.util.Map; // add this import at top if not already present

 @PatchMapping("/{bookingId}/payment")
 public ResponseEntity<ApiResponse<String>> markPayment(
         @AuthenticationPrincipal UserDetails userDetails,
         @PathVariable Long bookingId,
         @RequestBody Map<String, String> body) {

     String reference = body.get("paymentReference");
     return ResponseEntity.ok(bookingService.markAsPaid(userDetails.getUsername(), bookingId, reference));
 }
    
    
    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponse>> book(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BookingRequest.Create request) {
        return ResponseEntity.ok(bookingService.createBooking(userDetails.getUsername(), request));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> myBookings(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(bookingService.getMyBookings(userDetails.getUsername()));
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBooking(@PathVariable Long bookingId) {
        return ResponseEntity.ok(bookingService.getBookingById(bookingId));
    }

    @PatchMapping("/{bookingId}/status")
    public ResponseEntity<ApiResponse<BookingResponse>> updateStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long bookingId,
            @RequestBody BookingRequest.UpdateStatus request) {
        return ResponseEntity.ok(bookingService.updateBookingStatus(userDetails.getUsername(), bookingId, request.getStatus()));
    }

    @DeleteMapping("/{bookingId}")
    public ResponseEntity<ApiResponse<String>> cancel(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long bookingId) {
        return ResponseEntity.ok(bookingService.cancelBooking(userDetails.getUsername(), bookingId));
    }

    @GetMapping("/ride/{rideId}")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> rideBookings(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long rideId) {
        return ResponseEntity.ok(bookingService.getRideBookings(userDetails.getUsername(), rideId));
    }
}
