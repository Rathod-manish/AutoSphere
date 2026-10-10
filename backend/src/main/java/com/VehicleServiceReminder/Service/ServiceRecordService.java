package com.VehicleServiceReminder.Service;

import com.VehicleServiceReminder.DTO.ReminderResponse;
import com.VehicleServiceReminder.DTO.ServiceRecordRequest;
import com.VehicleServiceReminder.DTO.ServiceRecordResponse;
import com.VehicleServiceReminder.Entity.ServiceRecord;
import com.VehicleServiceReminder.Entity.Vehicle;
import com.VehicleServiceReminder.Repository.ServiceRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class ServiceRecordService {
    private final ServiceRecordRepository repository;
    private final VehicleService vehicleService;

    public ServiceRecordService(ServiceRecordRepository repository, VehicleService vehicleService) {
        this.repository = repository;
        this.vehicleService = vehicleService;
    }

    @Transactional(readOnly = true)
    public List<ServiceRecordResponse> findByVehicle(Long userId, Long vehicleId) {
        vehicleService.getOwned(userId, vehicleId);
        return repository.findAllByVehicleIdOrderByServiceDateDesc(vehicleId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public ServiceRecordResponse create(Long userId, Long vehicleId, ServiceRecordRequest request) {
        Vehicle vehicle = vehicleService.getOwned(userId, vehicleId);
        if (request.nextServiceDate().isBefore(request.serviceDate())) {
            throw new IllegalArgumentException("Next service date cannot be before service date.");
        }
        ServiceRecord record = new ServiceRecord();
        record.setVehicle(vehicle);
        apply(record, request);
        vehicle.setCurrentMileage(Math.max(vehicle.getCurrentMileage(), request.mileage()));
        return toResponse(repository.save(record));
    }

    @Transactional
    public ServiceRecordResponse update(Long userId, Long vehicleId, Long recordId, ServiceRecordRequest request) {
        vehicleService.getOwned(userId, vehicleId);
        ServiceRecord record = repository.findByIdAndVehicleId(recordId, vehicleId)
                .orElseThrow(() -> new IllegalArgumentException("Service record not found."));
        if (request.nextServiceDate().isBefore(request.serviceDate())) {
            throw new IllegalArgumentException("Next service date cannot be before service date.");
        }
        apply(record, request);
        record.getVehicle().setCurrentMileage(Math.max(record.getVehicle().getCurrentMileage(), request.mileage()));
        return toResponse(repository.save(record));
    }

    @Transactional
    public void delete(Long userId, Long vehicleId, Long recordId) {
        vehicleService.getOwned(userId, vehicleId);
        ServiceRecord record = repository.findByIdAndVehicleId(recordId, vehicleId)
                .orElseThrow(() -> new IllegalArgumentException("Service record not found."));
        repository.delete(record);
    }

    @Transactional(readOnly = true)
    public ReminderResponse reminder(Long userId, Long vehicleId) {
        Vehicle vehicle = vehicleService.getOwned(userId, vehicleId);
        ServiceRecord latest = repository.findAllByVehicleIdOrderByServiceDateDesc(vehicleId).stream().findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No service record exists for this vehicle yet."));
        LocalDate next = latest.getNextServiceDate();
        long days = ChronoUnit.DAYS.between(LocalDate.now(), next);
        return new ReminderResponse(vehicle.getId(), vehicle.getVehicleNumber(), next, days, status(days));
    }

    private void apply(ServiceRecord record, ServiceRecordRequest request) {
        record.setServiceDate(request.serviceDate());
        record.setServiceType(request.serviceType().trim());
        record.setMileage(request.mileage());
        record.setDescription(request.description() == null ? null : request.description().trim());
        record.setCost(request.cost());
        record.setNextServiceDate(request.nextServiceDate());
    }

    private ServiceRecordResponse toResponse(ServiceRecord r) {
        long days = ChronoUnit.DAYS.between(LocalDate.now(), r.getNextServiceDate());
        return new ServiceRecordResponse(r.getId(), r.getVehicle().getId(), r.getServiceDate(), r.getServiceType(), r.getMileage(), r.getDescription(), r.getCost(), r.getNextServiceDate(), days, status(days));
    }

    private String status(long days) {
        if (days < 0) return "OVERDUE";
        if (days == 0) return "DUE_TODAY";
        if (days <= 7) return "DUE_SOON";
        if (days <= 30) return "UPCOMING";
        return "SCHEDULED";
    }
}
