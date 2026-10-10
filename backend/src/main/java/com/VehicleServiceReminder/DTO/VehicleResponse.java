package com.VehicleServiceReminder.DTO;

import com.VehicleServiceReminder.Entity.VehicleType;
import java.time.LocalDate;

public record VehicleResponse(Long id, String vehicleNumber, VehicleType vehicleType, String brand, String model,
                              LocalDate purchaseDate, Integer currentMileage, Integer modelYear, String variant, String fuelType,
                              LocalDate insuranceExpiry, String tyreCondition, LocalDate tyreReplacementDate,
                              LocalDate batteryDate, String engineOil, String notes) {}
