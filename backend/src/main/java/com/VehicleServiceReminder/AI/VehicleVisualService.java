package com.VehicleServiceReminder.AI;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.VehicleServiceReminder.Entity.Vehicle;
import com.VehicleServiceReminder.Entity.VehicleVisualAsset;
import com.VehicleServiceReminder.Repository.VehicleVisualAssetRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.time.LocalDateTime;

@Service
public class VehicleVisualService {

    private static final List<String> VIEWS = List.of(
            "front-3-4", "side", "rear-3-4", "rear",
            "rear-3-4-right", "side-right", "front-3-4-right", "front"
    );

    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final VehicleVisualAssetRepository visualAssetRepository;
    private final String apiKey;

    public VehicleVisualService(
            ObjectMapper objectMapper,
            VehicleVisualAssetRepository visualAssetRepository,
            @Value("${app.visuals.api-key:}") String apiKey,
            @Value("${app.visuals.base-url:https://carimage.dev/api/v1}") String baseUrl) {
        this.objectMapper = objectMapper;
        this.visualAssetRepository = visualAssetRepository;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.restClient = RestClient.builder().baseUrl(removeTrailingSlash(baseUrl)).build();
    }

    /**
     * Creates signed 8-angle URLs only after the authenticated owner explicitly requests the 360 view.
     * Each newly created image URL may cost one provider credit; loading a cached URL does not call this method.
     */
    @Transactional
    public VisualResponse getSpin(Vehicle vehicle, String requestedColor) {
        String make = vehicle == null ? null : vehicle.getBrand();
        String model = vehicle == null ? null : vehicle.getModel();
        Integer year = vehicle == null ? null : vehicle.getModelYear();
        String color = normalizeColor(requestedColor);
        if (vehicle == null || isBlank(make) || isBlank(model) || year == null) {
            return new VisualResponse(false, "Make, model and model year are required.", List.of(), null, null, null);
        }
        if (apiKey.isBlank()) {
            return new VisualResponse(false,
                    "CAR_IMAGE_API_KEY is not configured. The local interactive 3D model remains available.",
                    List.of(), null, null, null);
        }

        // Server-side cache protects provider credits even if a browser cache is cleared or a user reloads.
        VehicleVisualAsset cachedAsset = findAsset(vehicle, color);
        if (cachedAsset != null && !isBlank(cachedAsset.getSignedFramesJson())
                && cachedAsset.getFramesExpiresAt() != null
                && cachedAsset.getFramesExpiresAt().isAfter(LocalDateTime.now().plusHours(2))) {
            try {
                List<VisualFrame> cachedFrames = objectMapper.readValue(cachedAsset.getSignedFramesJson(), new TypeReference<List<VisualFrame>>() {});
                if (!cachedFrames.isEmpty()) {
                    return new VisualResponse(true, "Loaded the saved 360 view cache; no new provider image request was made.",
                            cachedFrames, null, 0, cachedAsset.getCreditsRemaining());
                }
            } catch (Exception ignored) {
                // An unreadable cache expires naturally and may be regenerated through the explicit user action.
            }
        }

        List<Map<String, Object>> requests = new ArrayList<>();
        for (String view : VIEWS) {
            Map<String, Object> image = new LinkedHashMap<>();
            image.put("make", make.trim());
            image.put("model", model.trim());
            image.put("year", year);
            image.put("view", view);
            image.put("color", color);
            image.put("width", 960);
            image.put("height", 640);
            image.put("fit", "contain");
            image.put("background", "0f131a");
            image.put("format", "webp");
            requests.add(image);
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("images", requests);
        body.put("ttl_seconds", 604800);
        body.put("max_uses", 0);

        try {
            String json = restClient.post().uri("/image-urls")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey)
                    .body(body)
                    .retrieve().body(String.class);
            JsonNode root = objectMapper.readTree(json);
            JsonNode data = root.path("data");
            if (!data.isArray()) {
                return new VisualResponse(false, "Vehicle visual provider returned no images.", List.of(), null, credits(root, "credits_charged"), credits(root, "credits_remaining"));
            }
            List<VisualFrame> frames = new ArrayList<>();
            for (JsonNode node : data) {
                String view = node.path("vehicle").path("view").asText("");
                String url = node.path("url").asText("");
                if (!url.isBlank()) frames.add(new VisualFrame(view, url));
            }
            if (frames.isEmpty()) {
                return new VisualResponse(false, "No visual frames were returned for this vehicle.", List.of(), null, credits(root, "credits_charged"), credits(root, "credits_remaining"));
            }
            String providerVehicleId = data.get(0).path("vehicle").path("vehicle_id").asText(null);
            VehicleVisualAsset asset = cachedAsset;
            if (asset == null) {
                asset = new VehicleVisualAsset();
                asset.setVehicle(vehicle);
                asset.setMake(make.trim());
                asset.setModel(model.trim());
                asset.setModelYear(year);
                asset.setColor(color);
                asset.setStatus("NONE");
                asset.setProgress(0);
            }
            asset.setSignedFramesJson(objectMapper.writeValueAsString(frames));
            asset.setFramesExpiresAt(LocalDateTime.now().plusDays(5));
            Integer remaining = credits(root, "credits_remaining");
            Integer charged = credits(root, "credits_charged");
            if (remaining != null) asset.setCreditsRemaining(remaining);
            if (charged != null) asset.setCreditsCharged(charged);
            visualAssetRepository.save(asset);
            return new VisualResponse(true, "Ready", frames, providerVehicleId, charged, remaining);
        } catch (RestClientResponseException ex) {
            return new VisualResponse(false, safeProviderError(ex), List.of(), null, null, null);
        } catch (Exception ex) {
            return new VisualResponse(false,
                    "The visual provider could not return a matching 360 set. Your local interactive 3D profile remains available.",
                    List.of(), null, null, null);
        }
    }

    /**
     * Creates one catalog showroom image only after the owner explicitly confirms the one-image credit.
     * The provider's free developer tier starts with 100 image credits; a cached signed URL is reused
     * for five days so reloading the dashboard doesn't spend another credit.
     */
    @Transactional
    public HeroVisualResponse getHero(Vehicle vehicle, String requestedColor, boolean confirmedCredit) {
        String make = vehicle == null ? null : vehicle.getBrand();
        String model = vehicle == null ? null : vehicle.getModel();
        Integer year = vehicle == null ? null : vehicle.getModelYear();
        String color = normalizeColor(requestedColor);
        if (vehicle == null || isBlank(make) || isBlank(model) || year == null) {
            return new HeroVisualResponse(false, "Save the vehicle make, model and model year first.", null, null, null);
        }
        if (apiKey.isBlank()) {
            return new HeroVisualResponse(false,
                    "CAR_IMAGE_API_KEY is not configured. Keep using the free interactive local 3D model.", null, null, null);
        }

        VehicleVisualAsset asset = findAsset(vehicle, color);
        if (asset != null && !isBlank(asset.getHeroImageUrl()) && asset.getHeroImageExpiresAt() != null
                && asset.getHeroImageExpiresAt().isAfter(LocalDateTime.now().plusHours(6))) {
            return new HeroVisualResponse(true, "Loaded the cached catalog image; no new image credit was used.",
                    asset.getHeroImageUrl(), 0, asset.getCreditsRemaining());
        }
        if (!confirmedCredit) {
            return new HeroVisualResponse(false, "Confirm the one-image credit before requesting a catalog image.", null, null, null);
        }

        if (asset == null) {
            asset = new VehicleVisualAsset();
            asset.setVehicle(vehicle);
            asset.setMake(make.trim());
            asset.setModel(model.trim());
            asset.setModelYear(year);
            asset.setColor(color);
            asset.setStatus("NONE");
            asset.setProgress(0);
        }

        Map<String, Object> image = new LinkedHashMap<>();
        image.put("make", make.trim());
        image.put("model", model.trim());
        image.put("year", year);
        image.put("view", "front-3-4");
        image.put("color", color);
        image.put("width", 1200);
        image.put("height", 760);
        image.put("fit", "contain");
        image.put("background", "0b1018");
        image.put("format", "webp");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("images", List.of(image));
        body.put("ttl_seconds", 604800);
        body.put("max_uses", 0);

        String idempotencyKey = ("autosphere-hero-" + vehicle.getId() + "-" + year + "-" + color)
                .replaceAll("[^A-Za-z0-9._:-]", "-");
        try {
            String json = restClient.post().uri("/image-urls")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Idempotency-Key", idempotencyKey)
                    .body(body)
                    .retrieve().body(String.class);
            JsonNode root = objectMapper.readTree(json);
            JsonNode data = root.path("data");
            JsonNode first = data.isArray() && !data.isEmpty() ? data.get(0) : data;
            String url = first.path("url").asText("");
            if (url.isBlank()) {
                return new HeroVisualResponse(false,
                        "The catalog did not return an image for this exact make/model/year. Your local 3D model is still available.",
                        null, credits(root, "credits_charged"), credits(root, "credits_remaining"));
            }
            asset.setHeroImageUrl(url);
            // Cache slightly less than the provider's maximum seven-day URL life.
            asset.setHeroImageExpiresAt(LocalDateTime.now().plusDays(5));
            Integer charged = credits(root, "credits_charged");
            Integer remaining = credits(root, "credits_remaining");
            if (charged != null) asset.setCreditsCharged(charged);
            if (remaining != null) asset.setCreditsRemaining(remaining);
            visualAssetRepository.save(asset);
            return new HeroVisualResponse(true, "Catalog image ready. The signed URL is cached for five days.",
                    url, charged == null ? 1 : charged, remaining);
        } catch (RestClientResponseException ex) {
            return new HeroVisualResponse(false, safeProviderError(ex), null, null, null);
        } catch (Exception ex) {
            return new HeroVisualResponse(false,
                    "Could not load a catalog image. Your saved vehicle and local interactive 3D model are unaffected.",
                    null, null, null);
        }
    }

    /** Reads the owner's stored provider model and refreshes a processing request (polling is not billable). */
    @Transactional
    public Model3DResponse getModel(Vehicle vehicle, String requestedColor) {
        String color = normalizeColor(requestedColor);
        VehicleVisualAsset asset = findAsset(vehicle, color);
        if (asset != null) {
            if (!apiKey.isBlank() && "PROCESSING".equalsIgnoreCase(asset.getStatus()) && !isBlank(asset.getProviderRequestId())) {
                refreshModel(asset);
            }
            return toModelResponse(asset, !apiKey.isBlank());
        }
        if (apiKey.isBlank()) {
            return new Model3DResponse(false, false, "NOT_CONFIGURED", 0, null, null,
                    vehicle.getBrand(), vehicle.getModel(), vehicle.getModelYear(), color,
                    "Exact catalog 3D generation is disabled until CAR_IMAGE_API_KEY is configured on the backend. A local interactive 3D profile is shown in the meantime.",
                    null, null, false, null);
        }
        if (vehicle.getModelYear() == null) {
            return new Model3DResponse(true, false, "YEAR_REQUIRED", 0, null, null,
                    vehicle.getBrand(), vehicle.getModel(), null, color,
                    "Add the model year to request a catalog-matched 3D model.", null, null, false, null);
        }
        return new Model3DResponse(true, false, "NONE", 0, null, null,
                vehicle.getBrand(), vehicle.getModel(), vehicle.getModelYear(), color,
                "No provider model has been ordered for this vehicle yet. You can keep using the instant local 3D model or request a catalog-generated model when ready.",
                null, null, false, null);
    }

    /**
     * Creates a provider 3D model only when the signed-in owner explicitly confirms the credit cost.
     * The request is idempotent so retries after a network timeout cannot accidentally double-order it.
     */
    @Transactional
    public Model3DResponse createModel(Vehicle vehicle, String requestedColor, boolean confirmedCost) {
        if (!confirmedCost) {
            throw new IllegalArgumentException("Confirm the provider's possible 100-credit model-generation cost before continuing.");
        }
        String color = normalizeColor(requestedColor);
        if (vehicle.getModelYear() == null) {
            return new Model3DResponse(!apiKey.isBlank(), false, "YEAR_REQUIRED", 0, null, null,
                    vehicle.getBrand(), vehicle.getModel(), null, color,
                    "Add the model year before requesting a catalog-generated 3D model.", null, null, false, null);
        }
        if (apiKey.isBlank()) {
            return new Model3DResponse(false, false, "NOT_CONFIGURED", 0, null, null,
                    vehicle.getBrand(), vehicle.getModel(), vehicle.getModelYear(), color,
                    "CAR_IMAGE_API_KEY is missing on the backend. AutoSphere's local interactive 3D profile continues to work.",
                    null, null, false, null);
        }

        VehicleVisualAsset asset = findAsset(vehicle, color);
        if (asset != null && "READY".equalsIgnoreCase(asset.getStatus()) && !isBlank(asset.getPublicModelId())) {
            return toModelResponse(asset, true);
        }
        if (asset != null && "PROCESSING".equalsIgnoreCase(asset.getStatus()) && !isBlank(asset.getProviderRequestId())) {
            refreshModel(asset);
            return toModelResponse(asset, true);
        }
        // In case the provider accepted the first request but its response timed out before returning an ID,
        // keep the persisted idempotency key and replay it only after another explicit user confirmation.
        if (asset != null && "REQUESTING".equalsIgnoreCase(asset.getStatus()) && !isBlank(asset.getIdempotencyKey())) {
            // Continue below with the exact same key; provider idempotency prevents a second order.
        }

        if (asset == null) {
            asset = new VehicleVisualAsset();
            asset.setVehicle(vehicle);
            asset.setMake(vehicle.getBrand().trim());
            asset.setModel(vehicle.getModel().trim());
            asset.setModelYear(vehicle.getModelYear());
            asset.setColor(color);
        }
        // For an interrupted request keep the same idempotency key; for a known failed request start a new attempt.
        boolean liveOrUncertainRequest = List.of("REQUESTING", "PROCESSING", "QUEUED").contains(String.valueOf(asset.getStatus()).toUpperCase(Locale.ROOT));
        if (!liveOrUncertainRequest || isBlank(asset.getIdempotencyKey())) {
            asset.setIdempotencyKey("autosphere-3d-" + UUID.randomUUID());
        }
        asset.setStatus("REQUESTING");
        asset.setProgress(0);
        asset.setMessage("Submitting a catalog 3D generation request safely. You can continue using the local model.");
        asset = visualAssetRepository.save(asset);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("make", vehicle.getBrand().trim());
        body.put("model", vehicle.getModel().trim());
        body.put("year", vehicle.getModelYear());
        body.put("color", color);
        body.put("publish", true);

        try {
            String json = restClient.post().uri("/3d")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Idempotency-Key", asset.getIdempotencyKey())
                    .body(body)
                    .retrieve().body(String.class);
            JsonNode root = objectMapper.readTree(json);
            applyModelPayload(asset, root);
            visualAssetRepository.save(asset);
            return toModelResponse(asset, true);
        } catch (RestClientResponseException ex) {
            String message = safeProviderError(ex);
            int statusCode = ex.getStatusCode().value();
            if (statusCode == 400 || statusCode == 401 || statusCode == 402 || statusCode == 403 || statusCode == 404 || statusCode == 503) {
                asset.setStatus("FAILED");
                asset.setMessage(message);
                asset.setIdempotencyKey(null);
            } else {
                // A 5xx/network boundary may happen after the provider accepted the order. Retain the same key for a safe replay.
                asset.setStatus("REQUESTING");
                asset.setMessage("The provider response was interrupted. Press Resume to safely retry the same idempotent request; no new order key will be created.");
            }
            visualAssetRepository.save(asset);
            return toModelResponse(asset, true);
        } catch (Exception ex) {
            asset.setStatus("REQUESTING");
            asset.setMessage("AutoSphere could not confirm the provider response. Press Resume to safely retry the same request; your local 3D model stays available.");
            visualAssetRepository.save(asset);
            return toModelResponse(asset, true);
        }
    }

    @Transactional
    protected void refreshModel(VehicleVisualAsset asset) {
        if (apiKey.isBlank() || isBlank(asset.getProviderRequestId())) return;
        try {
            String json = restClient.get().uri("/3d/{id}", asset.getProviderRequestId())
                    .header("Authorization", "Bearer " + apiKey)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve().body(String.class);
            applyModelPayload(asset, objectMapper.readTree(json));
            visualAssetRepository.save(asset);
        } catch (Exception ex) {
            // Keep the last valid state. Refreshing is free and can be retried later.
            asset.setMessage("The provider status is temporarily unavailable. Your saved vehicle and local 3D model are unaffected.");
        }
    }

    private void applyModelPayload(VehicleVisualAsset asset, JsonNode root) {
        JsonNode data = root.path("data");
        String requestId = data.path("id").asText("");
        if (!requestId.isBlank()) asset.setProviderRequestId(requestId);
        String providerStatus = data.path("status").asText(asset.getStatus()).toUpperCase(Locale.ROOT);
        String publicId = data.path("public").path("id").asText("");
        if (!publicId.isBlank()) asset.setPublicModelId(publicId);

        // Normalize provider variants so a new status spelling cannot stop the UI's poller.
        if ((List.of("READY", "COMPLETED", "SUCCEEDED", "SUCCESS", "PUBLISHED", "AVAILABLE").contains(providerStatus))
                && !isBlank(asset.getPublicModelId())) {
            asset.setStatus("READY");
            asset.setProgress(100);
        } else if (List.of("FAILED", "ERROR", "CANCELLED", "REJECTED").contains(providerStatus)) {
            asset.setStatus("FAILED");
        } else {
            asset.setStatus("PROCESSING");
            if (data.path("progress").canConvertToInt()) asset.setProgress(Math.max(0, Math.min(100, data.path("progress").asInt())));
        }

        JsonNode billing = root.path("billing");
        if (billing.has("credits_charged") && !billing.path("credits_charged").isNull()) asset.setCreditsCharged(billing.path("credits_charged").asInt());
        if (billing.has("credits_remaining") && !billing.path("credits_remaining").isNull()) asset.setCreditsRemaining(billing.path("credits_remaining").asInt());
        if (billing.has("already_owned")) asset.setAlreadyOwned(billing.path("already_owned").asBoolean(false));
        if (data.has("estimated_seconds_remaining") && !data.path("estimated_seconds_remaining").isNull()) asset.setEstimatedSecondsRemaining(data.path("estimated_seconds_remaining").asLong());
        else if ("READY".equals(asset.getStatus())) asset.setEstimatedSecondsRemaining(0L);

        String providerError = data.path("error").asText("");
        if ("FAILED".equals(asset.getStatus())) {
            asset.setMessage(isBlank(providerError) ? "The provider could not generate this exact catalog visual. The local interactive 3D profile remains available." : "The provider reported a generation failure. The local interactive 3D profile remains available.");
            asset.setIdempotencyKey(null);
        } else if ("READY".equals(asset.getStatus()) && !isBlank(asset.getPublicModelId())) {
            asset.setMessage("Provider-generated catalog 3D model is ready. It is a reconstruction from renders, not OEM-certified CAD.");
            asset.setEstimatedSecondsRemaining(0L);
        } else {
            asset.setMessage("Your catalog-matched 3D model is being prepared. The local interactive model remains available meanwhile.");
        }
    }

    private VehicleVisualAsset findAsset(Vehicle vehicle, String color) {
        return visualAssetRepository.findByVehicle_IdAndMakeIgnoreCaseAndModelIgnoreCaseAndModelYearAndColorIgnoreCase(
                vehicle.getId(), vehicle.getBrand(), vehicle.getModel(), vehicle.getModelYear(), color).orElse(null);
    }

    private Model3DResponse toModelResponse(VehicleVisualAsset asset, boolean enabled) {
        boolean available = !isBlank(asset.getPublicModelId());
        return new Model3DResponse(enabled, available, asset.getStatus(), asset.getProgress(),
                asset.getProviderRequestId(), asset.getPublicModelId(), asset.getMake(), asset.getModel(),
                asset.getModelYear(), asset.getColor(), asset.getMessage(), asset.getCreditsCharged(),
                asset.getCreditsRemaining(), Boolean.TRUE.equals(asset.getAlreadyOwned()), asset.getEstimatedSecondsRemaining());
    }

    private String normalizeColor(String value) {
        String color = isBlank(value) ? "silver" : value.trim().toLowerCase(Locale.ROOT);
        if (!color.matches("[a-z0-9# -]{1,30}")) return "silver";
        return color;
    }

    private Integer credits(JsonNode root, String field) {
        JsonNode node = root.path("billing").path(field);
        return node.isMissingNode() || node.isNull() ? null : node.asInt();
    }

    private String safeProviderError(RestClientResponseException ex) {
        return switch (ex.getStatusCode().value()) {
            case 400 -> "The provider rejected this make/model/year/color combination. Check the saved year and model spelling; your local 3D profile remains available.";
            case 401, 403 -> "The vehicle-visual API key was rejected or does not have permission. Check CAR_IMAGE_API_KEY on the backend.";
            case 402 -> "The provider does not have enough credits for this request. No new 3D model was created; check the provider's current pricing and balance.";
            case 404 -> "The provider catalog does not contain this exact make/model/year. The local interactive 3D profile remains available.";
            case 429 -> "The visual provider rate limit was reached. Wait a little and retry.";
            case 503 -> "3D generation is temporarily at capacity or disabled by the provider. No model charge was made for this request.";
            default -> "The vehicle-visual provider is temporarily unavailable. Your saved vehicle and local 3D model are unaffected.";
        };
    }

    private boolean isBlank(String value) { return value == null || value.isBlank(); }

    private String removeTrailingSlash(String value) {
        String result = value == null || value.isBlank() ? "https://carimage.dev/api/v1" : value.trim();
        while (result.endsWith("/")) result = result.substring(0, result.length() - 1);
        return result;
    }

    public record VisualFrame(String view, String url) {}
    public record HeroVisualResponse(boolean enabled, String message, String url, Integer creditsCharged, Integer creditsRemaining) {}
    public record VisualResponse(boolean enabled, String message, List<VisualFrame> frames, String vehicleId,
                                 Integer creditsCharged, Integer creditsRemaining) {}
    public record Model3DResponse(boolean enabled, boolean available, String status, Integer progress,
                                  String providerRequestId, String publicModelId, String make, String model,
                                  Integer year, String color, String message, Integer creditsCharged,
                                  Integer creditsRemaining, boolean alreadyOwned, Long estimatedSecondsRemaining) {}
}
