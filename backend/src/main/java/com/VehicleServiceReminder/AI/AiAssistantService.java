package com.VehicleServiceReminder.AI;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.VehicleServiceReminder.DTO.ReminderResponse;
import com.VehicleServiceReminder.DTO.ServiceRecordResponse;
import com.VehicleServiceReminder.Entity.Vehicle;
import com.VehicleServiceReminder.Service.ServiceRecordService;
import com.VehicleServiceReminder.Service.VehicleService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class AiAssistantService {

    private final VehicleService vehicleService;
    private final ServiceRecordService serviceRecordService;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public AiAssistantService(
            VehicleService vehicleService,
            ServiceRecordService serviceRecordService,
            ObjectMapper objectMapper,
            @Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.model:gemini-3.8-flash}") String model,
            @Value("${app.ai.base-url:https://generativelanguage.googleapis.com/v1beta}") String baseUrl) {

        this.vehicleService = vehicleService;
        this.serviceRecordService = serviceRecordService;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model == null || model.isBlank() ? "gemini-3.8-flash" : model.trim();

        this.restClient = RestClient.builder()
                .baseUrl(removeTrailingSlash(baseUrl))
                .build();
    }

    public AssistantChatResponse chat(Long userId, AssistantChatRequest request) {
        Vehicle vehicle = vehicleService.getOwned(userId, request.vehicleId());
        List<ServiceRecordResponse> records = serviceRecordService.findByVehicle(userId, vehicle.getId());

        ReminderResponse reminder = null;
        try {
            reminder = serviceRecordService.reminder(userId, vehicle.getId());
        } catch (IllegalArgumentException ignored) {
            // Vehicle can exist before its first service record.
        }

        String mode = normalizeMode(request.mode(), request.question());
        String context = buildContext(vehicle, records, reminder);

        // The backend still works when the developer has not entered a Gemini key yet.
        if (apiKey.isBlank()) {
            return new AssistantChatResponse(
                    localFallback(request.question(), vehicle, records, reminder)
                            + "\n\nGemini AI is not configured yet. Add GEMINI_API_KEY to the STS Run Configuration to enable live AI answers.",
                    false,
                    mode,
                    model
            );
        }

        String systemInstruction = buildInstructions(mode);
        String prompt = "VEHICLE CONTEXT:\n" + context
                + "\n\nUSER REQUEST:\n" + request.question().trim();

        try {
            String body = buildGeminiRequest(systemInstruction, prompt);

            String responseBody = restClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models/{model}:generateContent")
                            .build(model))
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("x-goog-api-key", apiKey)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            String reply = extractGeminiText(responseBody);

            if (reply == null || reply.isBlank()) {
                throw new IllegalStateException("Gemini returned an empty response.");
            }

            return new AssistantChatResponse(reply.trim(), true, mode, model);

        } catch (Exception ex) {
            return new AssistantChatResponse(
                    localFallback(request.question(), vehicle, records, reminder)
                            + "\n\nGemini AI is temporarily unavailable. This answer uses your saved vehicle data.",
                    false,
                    mode,
                    model
            );
        }
    }

    private String buildGeminiRequest(String systemInstruction, String prompt) throws Exception {
        var root = objectMapper.createObjectNode();

        var system = root.putObject("system_instruction");
        var systemParts = system.putArray("parts");
        systemParts.addObject().put("text", systemInstruction);

        var contents = root.putArray("contents");
        var userContent = contents.addObject();
        userContent.put("role", "user");
        userContent.putArray("parts").addObject().put("text", prompt);

        var generationConfig = root.putObject("generationConfig");
        generationConfig.put("temperature", 0.2);
        generationConfig.put("maxOutputTokens", 1200);

        return root.toString();
    }

    private String buildInstructions(String mode) {
        String modeInstruction = switch (mode) {
            case "SERVICE_PREDICTION" ->
                    "Predict a practical next maintenance window using the logged service timeline, next due date, mileage, and vehicle context. Clearly distinguish recorded facts from estimates. Do not invent a manufacturer-specific interval. Give a concise action plan.";
            case "SYMPTOM_ANALYSIS" ->
                    "Analyze the user's vehicle symptom as maintenance guidance, not a definitive mechanical diagnosis. List plausible areas to inspect, urgency indicators, and what a qualified technician should check. Do not claim certainty without evidence.";
            case "SERVICE_SUMMARY" ->
                    "Create a clear maintenance summary using only the supplied profile and service records. Mention last service, next due date, spend, and recurring maintenance patterns only when supported by the data.";
            default ->
                    "Act as an automotive maintenance copilot. Answer using the supplied vehicle context. Be concrete and transparent about uncertainty. Never invent service records, defects, specifications, or costs.";
        };

        return "You are AutoSphere AI, the maintenance intelligence layer of a vehicle service reminder and history system. "
                + modeInstruction + " "
                + "Prefer the user's saved facts over generic assumptions. "
                + "For safety-critical symptoms such as brake failure, steering problems, smoke, fuel leaks, overheating, or loss of control, advise stopping use and getting a qualified professional inspection. "
                + "Do not provide dangerous repair instructions. Use Indian English where natural, and make dates easy to understand.";
    }

    private String buildContext(Vehicle vehicle, List<ServiceRecordResponse> records, ReminderResponse reminder) {
        String history = records.stream()
                .limit(15)
                .map(r -> "- " + r.serviceDate() + " | " + r.serviceType() + " | "
                        + r.mileage() + " km | ₹" + r.cost() + " | next: "
                        + r.nextServiceDate() + " | "
                        + (r.description() == null ? "" : r.description()))
                .collect(Collectors.joining("\n"));

        return "Today: " + LocalDate.now() + "\n"
                + "Vehicle: " + vehicle.getBrand() + " " + vehicle.getModel()
                + " | type: " + vehicle.getVehicleType()
                + " | registration: " + vehicle.getVehicleNumber()
                + " | variant: " + value(vehicle.getVariant())
                + " | fuel/energy: " + value(vehicle.getFuelType())
                + " | current mileage: " + vehicle.getCurrentMileage() + " km"
                + " | model year: " + value(vehicle.getModelYear())
                + " | purchase date: " + value(vehicle.getPurchaseDate()) + "\n"
                + "Insurance expiry: " + value(vehicle.getInsuranceExpiry())
                + " | tyre condition: " + value(vehicle.getTyreCondition())
                + " | tyre replacement: " + value(vehicle.getTyreReplacementDate())
                + " | battery date: " + value(vehicle.getBatteryDate())
                + " | engine oil: " + value(vehicle.getEngineOil()) + "\n"
                + "Owner notes: " + value(vehicle.getNotes()) + "\n"
                + "Reminder: " + (reminder == null
                        ? "No service reminder exists yet."
                        : reminder.status() + " | next service: " + reminder.nextServiceDate()
                        + " | days until: " + reminder.daysUntilService()) + "\n"
                + "Service history:\n"
                + (history.isBlank() ? "No service history yet." : history);
    }

    private String extractGeminiText(String responseBody) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode candidates = root.path("candidates");

        if (!candidates.isArray() || candidates.isEmpty()) {
            JsonNode error = root.path("error");
            if (!error.isMissingNode()) {
                throw new IllegalStateException(error.path("message").asText("Gemini request failed."));
            }
            return "";
        }

        StringBuilder text = new StringBuilder();
        JsonNode parts = candidates.get(0).path("content").path("parts");

        if (parts.isArray()) {
            for (JsonNode part : parts) {
                JsonNode partText = part.get("text");
                if (partText != null && partText.isTextual()) {
                    if (text.length() > 0) text.append("\n");
                    text.append(partText.asText());
                }
            }
        }

        return text.toString();
    }

    private String normalizeMode(String mode, String question) {
        if (mode != null && !mode.isBlank()) return mode.trim().toUpperCase();

        String q = question == null ? "" : question.toLowerCase();
        if (q.contains("predict") || q.contains("when should") || q.contains("next service")) {
            return "SERVICE_PREDICTION";
        }
        if (q.contains("noise") || q.contains("vibration") || q.contains("smoke")
                || q.contains("warning") || q.contains("problem")) {
            return "SYMPTOM_ANALYSIS";
        }
        if (q.contains("summarize") || q.contains("summary")) {
            return "SERVICE_SUMMARY";
        }
        return "CHAT";
    }

    private String localFallback(
            String question,
            Vehicle vehicle,
            List<ServiceRecordResponse> records,
            ReminderResponse reminder) {

        String q = question == null ? "" : question.toLowerCase();
        ServiceRecordResponse latest = records.isEmpty() ? null : records.get(0);

        if (q.contains("next") || q.contains("due") || q.contains("service")) {
            if (reminder == null) {
                return "Your " + vehicle.getBrand() + " " + vehicle.getModel()
                        + " has no service reminder yet. Add a service record with the next-service date and I can track it from there.";
            }
            return vehicle.getBrand() + " " + vehicle.getModel() + " is "
                    + reminder.status().toLowerCase().replace('_', ' ')
                    + ". Next service: " + reminder.nextServiceDate()
                    + " (" + reminder.daysUntilService() + " days from today).";
        }

        if (q.contains("last")) {
            return latest == null
                    ? "No service history is logged yet."
                    : "Last recorded service: " + latest.serviceType()
                    + " on " + latest.serviceDate()
                    + " at " + latest.mileage() + " km.";
        }

        if (q.contains("cost") || q.contains("spent")) {
            BigDecimal total = records.stream()
                    .map(ServiceRecordResponse::cost)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            return "Recorded maintenance spend for this vehicle is ₹" + total.toPlainString() + ".";
        }

        return "I have your " + vehicle.getBrand() + " " + vehicle.getModel()
                + " context and service history. Ask me about the next service, last service, costs, engine symptoms, tyres, brakes, battery, or a maintenance summary.";
    }

    private String value(Object value) {
        return value == null ? "not recorded" : String.valueOf(value);
    }

    private String removeTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "https://generativelanguage.googleapis.com/v1beta";
        }
        String result = value.trim();
        while (result.endsWith("/")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }
}
