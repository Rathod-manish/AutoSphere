package com.VehicleServiceReminder.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ServiceRecordResponse(Long id, Long vehicleId, LocalDate serviceDate, String serviceType,
                                    Integer mileage, String description, BigDecimal cost,
                                    LocalDate nextServiceDate, long daysUntilService, String reminderStatus) {}
