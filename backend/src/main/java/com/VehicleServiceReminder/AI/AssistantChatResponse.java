package com.VehicleServiceReminder.AI;

public record AssistantChatResponse(
        String reply,
        boolean aiPowered,
        String mode,
        String model
) {}
