package com.VehicleServiceReminder.AI;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AssistantChatRequest(
        @NotNull Long vehicleId,
        @NotBlank String question,
        String mode
) {}
