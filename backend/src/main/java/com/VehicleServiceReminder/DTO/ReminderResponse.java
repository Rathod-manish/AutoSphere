package com.VehicleServiceReminder.DTO;

import java.time.LocalDate;

public record ReminderResponse(Long vehicleId, String vehicleNumber, LocalDate nextServiceDate,
                               long daysUntilService, String status) {}
