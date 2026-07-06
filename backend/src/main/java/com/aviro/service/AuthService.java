package com.aviro.service;

import com.aviro.dto.request.AuthRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.AuthResponse;

public interface AuthService {
    ApiResponse<AuthResponse> register(AuthRequest.Register request);

    // Step 1: verify password, send OTP, return NO token yet
    ApiResponse<String> login(AuthRequest.Login request);

    // Step 2: verify the login OTP, NOW return the token
    ApiResponse<AuthResponse> verifyLoginOtp(AuthRequest.LoginVerifyOtp request);

    ApiResponse<String> verifyOtp(AuthRequest.VerifyOtp request);
    ApiResponse<AuthResponse> refreshToken(AuthRequest.RefreshToken request);
    ApiResponse<String> forgotPassword(AuthRequest.ForgotPassword request);
    ApiResponse<String> resetPassword(AuthRequest.ResetPassword request);
    ApiResponse<String> logout(String email);

    // College email verification (.edu.in domain only)
    ApiResponse<String> sendCollegeEmailOtp(String userEmail, AuthRequest.SendCollegeEmailOtp request);
    ApiResponse<String> verifyCollegeEmailOtp(String userEmail, AuthRequest.VerifyCollegeEmailOtp request);
}