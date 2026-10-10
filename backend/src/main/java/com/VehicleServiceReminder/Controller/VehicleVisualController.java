package com.VehicleServiceReminder.Controller;

import com.VehicleServiceReminder.AI.VehicleVisualService;
import com.VehicleServiceReminder.Entity.Vehicle;
import com.VehicleServiceReminder.Service.VehicleService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vehicle-visuals")
public class VehicleVisualController {

    private final VehicleVisualService vehicleVisualService;
    private final VehicleService vehicleService;

    public VehicleVisualController(VehicleVisualService vehicleVisualService, VehicleService vehicleService) {
        this.vehicleVisualService = vehicleVisualService;
        this.vehicleService = vehicleService;
    }

    /** Billable signed 360 image URLs are generated only when the owner explicitly asks for them. */
    @GetMapping("/vehicles/{vehicleId}/spin")
    public VehicleVisualService.VisualResponse spin(
            Authentication authentication,
            @PathVariable Long vehicleId,
            @RequestParam(defaultValue = "silver") String color) {
        Vehicle vehicle = vehicleService.getOwned(userId(authentication), vehicleId);
        return vehicleVisualService.getSpin(vehicle, color);
    }

    /** Creates or returns a cached single hero image after explicit confirmation of the one-image credit. */
    @PostMapping("/vehicles/{vehicleId}/hero")
    public VehicleVisualService.HeroVisualResponse hero(
            Authentication authentication,
            @PathVariable Long vehicleId,
            @RequestBody GenerateHeroRequest request) {
        Vehicle vehicle = vehicleService.getOwned(userId(authentication), vehicleId);
        return vehicleVisualService.getHero(vehicle, request == null ? "silver" : request.color(),
                request != null && request.confirmCredit());
    }

    /** Returns a stored exact-catalog model and refreshes non-billable status while generation runs. */
    @GetMapping("/vehicles/{vehicleId}/model")
    public VehicleVisualService.Model3DResponse model(
            Authentication authentication,
            @PathVariable Long vehicleId,
            @RequestParam(defaultValue = "silver") String color) {
        Vehicle vehicle = vehicleService.getOwned(userId(authentication), vehicleId);
        return vehicleVisualService.getModel(vehicle, color);
    }

    /** The explicit confirmation flag is required before requesting potentially billable 3D generation. */
    @PostMapping("/vehicles/{vehicleId}/model")
    public VehicleVisualService.Model3DResponse generateModel(
            Authentication authentication,
            @PathVariable Long vehicleId,
            @RequestBody Generate3DRequest request) {
        Vehicle vehicle = vehicleService.getOwned(userId(authentication), vehicleId);
        return vehicleVisualService.createModel(vehicle, request == null ? "silver" : request.color(),
                request != null && request.confirmCost());
    }

    private Long userId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalArgumentException("Your session has expired. Please log in again.");
        }
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Invalid authenticated user context.");
        }
    }

    public record Generate3DRequest(String color, boolean confirmCost) {}
    public record GenerateHeroRequest(String color, boolean confirmCredit) {}
}
