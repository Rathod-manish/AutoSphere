package com.VehicleServiceReminder.Controller;

import com.VehicleServiceReminder.DTO.ReminderResponse;
import com.VehicleServiceReminder.DTO.ServiceRecordRequest;
import com.VehicleServiceReminder.DTO.ServiceRecordResponse;
import com.VehicleServiceReminder.Service.ServiceRecordService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/service-records")
public class ServiceRecordController {
    private final ServiceRecordService service;

    public ServiceRecordController(ServiceRecordService service) { this.service = service; }

    @GetMapping("/vehicle/{vehicleId}")
    public List<ServiceRecordResponse> all(Authentication authentication, @PathVariable Long vehicleId) {
        return service.findByVehicle(userId(authentication), vehicleId);
    }

    @PostMapping("/vehicle/{vehicleId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceRecordResponse create(Authentication authentication, @PathVariable Long vehicleId,
                                        @Valid @RequestBody ServiceRecordRequest request) {
        return service.create(userId(authentication), vehicleId, request);
    }

    @PutMapping("/{recordId}/vehicle/{vehicleId}")
    public ServiceRecordResponse update(Authentication authentication, @PathVariable Long recordId,
                                        @PathVariable Long vehicleId, @Valid @RequestBody ServiceRecordRequest request) {
        return service.update(userId(authentication), vehicleId, recordId, request);
    }

    @DeleteMapping("/{recordId}/vehicle/{vehicleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long recordId, @PathVariable Long vehicleId) {
        service.delete(userId(authentication), vehicleId, recordId);
    }

    @GetMapping("/vehicle/{vehicleId}/reminder")
    public ReminderResponse reminder(Authentication authentication, @PathVariable Long vehicleId) {
        return service.reminder(userId(authentication), vehicleId);
    }

    private Long userId(Authentication authentication) { return Long.valueOf(authentication.getName()); }
}
