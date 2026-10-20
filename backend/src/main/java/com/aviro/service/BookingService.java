package com.aviro.service;

import com.aviro.dto.request.BookingRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.BookingResponse;
import java.util.List;
import java.util.Map;

public interface BookingService {
    ApiResponse<BookingResponse> createBooking(String email, BookingRequest.Create request);
    ApiResponse<List<BookingResponse>> getMyBookings(String email);
    ApiResponse<BookingResponse> getBookingById(String email, Long bookingId);
    ApiResponse<BookingResponse> updateBookingStatus(String email, Long bookingId, String status);
    ApiResponse<String> cancelBooking(String email, Long bookingId);
    ApiResponse<List<BookingResponse>> getRideBookings(String email, Long rideId);
    ApiResponse<String> markAsPaid(String email, Long bookingId, String paymentReference);

    // OTP endpoints
    ApiResponse<Map<String, String>> getRideOtp(String email, Long bookingId);
    ApiResponse<String> verifyRideOtp(String driverEmail, Long bookingId, String otp);
}
