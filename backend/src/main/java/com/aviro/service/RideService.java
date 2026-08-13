package com.aviro.service;

import com.aviro.dto.request.RideRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.dto.response.RideResponse;

import java.util.List;

public interface RideService {
    ApiResponse<RideResponse> createRide(String email, RideRequest.Create request);
    ApiResponse<List<RideResponse>> searchRides(RideRequest.Search request);
    ApiResponse<RideResponse> getRideById(Long rideId);
    ApiResponse<List<RideResponse>> getMyRides(String email);
    ApiResponse<RideResponse> updateRideStatus(String email, Long rideId, String status);
    ApiResponse<String> cancelRide(String email, Long rideId);
    ApiResponse<List<RideResponse>> getNearbyRides(Double lat, Double lng, Integer seats);
    ApiResponse<Double> estimateFare(String from, String to, Integer seats);
}
