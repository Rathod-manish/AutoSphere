package com.VehicleServiceReminder.Controller;

import com.VehicleServiceReminder.DTO.VehicleRequest;
import com.VehicleServiceReminder.DTO.VehicleResponse;
import com.VehicleServiceReminder.Security.JwtService;
import com.VehicleServiceReminder.Service.VehicleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {
    private final VehicleService vehicleService;
    private final JwtService jwtService;

    public VehicleController(VehicleService vehicleService, JwtService jwtService) {
        this.vehicleService = vehicleService;
        this.jwtService = jwtService;
    }

    @GetMapping
    public List<VehicleResponse> all(Authentication authentication) {
        return vehicleService.findAll(userId(authentication));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VehicleResponse create(Authentication authentication, @Valid @RequestBody VehicleRequest request) {
        return vehicleService.create(userId(authentication), request);
    }

    @PutMapping("/{id}")
    public VehicleResponse update(Authentication authentication, @PathVariable Long id, @Valid @RequestBody VehicleRequest request) {
        return vehicleService.update(userId(authentication), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long id) {
        vehicleService.delete(userId(authentication), id);
    }

    private Long userId(Authentication authentication) {
        return Long.valueOf(authentication.getName());
    }
}
