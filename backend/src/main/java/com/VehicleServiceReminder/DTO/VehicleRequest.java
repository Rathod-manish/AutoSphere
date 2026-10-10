package com.VehicleServiceReminder.DTO;

import com.VehicleServiceReminder.Entity.VehicleType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record VehicleRequest(
        @NotBlank String vehicleNumber,
        @NotNull VehicleType vehicleType,
        @NotBlank String brand,
        @NotBlank String model,
        LocalDate purchaseDate,
        @NotNull @Min(0) Integer currentMileage,
        @Min(1900) Integer modelYear,
        String variant,
        String fuelType,
        LocalDate insuranceExpiry,
        String tyreCondition,
        LocalDate tyreReplacementDate,
        LocalDate batteryDate,
        String engineOil,
        String notes
) {}
