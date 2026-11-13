package com.aviro.service;

import com.aviro.dto.request.AuthRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.AuthResponse;

public interface AuthService {

    ApiResponse<AuthResponse> register(AuthRequest.Register request);

    ApiResponse<AuthResponse> login(AuthRequest.Login request);

    ApiResponse<AuthResponse> verifyOtp(AuthRequest.VerifyOtp request);

    ApiResponse<String> resendOtp(AuthRequest.ResendOtp request);

    ApiResponse<AuthResponse> refreshToken(AuthRequest.RefreshToken request);

    ApiResponse<String> forgotPassword(AuthRequest.ForgotPassword request);

    ApiResponse<String> resetPassword(AuthRequest.ResetPassword request);

    ApiResponse<String> logout(String accessToken, String refreshToken);

    ApiResponse<String> sendCollegeEmailOtp(
            String userEmail, AuthRequest.SendCollegeEmailOtp request);

    ApiResponse<String> verifyCollegeEmailOtp(
            String userEmail, AuthRequest.VerifyCollegeEmailOtp request);
}
