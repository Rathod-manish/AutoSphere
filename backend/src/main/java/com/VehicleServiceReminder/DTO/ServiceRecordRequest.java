package com.VehicleServiceReminder.DTO;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ServiceRecordRequest(
        @NotNull LocalDate serviceDate,
        @NotBlank String serviceType,
        @NotNull @Min(0) Integer mileage,
        String description,
        @NotNull @DecimalMin("0.00") BigDecimal cost,
        @NotNull LocalDate nextServiceDate
) {}
