package com.VehicleServiceReminder.DTO;

public record AuthResponse(String token, Long userId, String name, String email) {}
