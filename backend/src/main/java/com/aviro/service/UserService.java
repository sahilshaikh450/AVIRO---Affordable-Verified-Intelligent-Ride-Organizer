package com.aviro.service;

import com.aviro.dto.request.ProfileUpdateRequest;
import com.aviro.dto.request.VehicleRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.UserResponse;
import com.aviro.dto.response.VehicleResponse;

public interface UserService {
    ApiResponse<UserResponse> getProfile(String email);

    ApiResponse<UserResponse> updateProfile(String email, ProfileUpdateRequest request);

    ApiResponse<VehicleResponse> addVehicle(String email, VehicleRequest request);

    ApiResponse<VehicleResponse> getVehicle(String email);

    VehiclePhotoResult setVehiclePhoto(String email, String kind, String url);

    record VehiclePhotoResult(VehicleResponse vehicle, String previousUrl) {}

    ApiResponse<String> addRideBuddy(String email, Long buddyId);

    ApiResponse<String> removeRideBuddy(String email, Long buddyId);

    ApiResponse<Object> getDashboardStats(String email);
}
