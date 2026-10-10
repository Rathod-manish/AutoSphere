package com.VehicleServiceReminder.Service;

import com.VehicleServiceReminder.DTO.ReminderResponse;
import com.VehicleServiceReminder.DTO.VehicleRequest;
import com.VehicleServiceReminder.DTO.VehicleResponse;
import com.VehicleServiceReminder.Entity.User;
import com.VehicleServiceReminder.Entity.Vehicle;
import com.VehicleServiceReminder.Repository.UserRepository;
import com.VehicleServiceReminder.Repository.VehicleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class VehicleService {
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;

    public VehicleService(VehicleRepository vehicleRepository, UserRepository userRepository) {
        this.vehicleRepository = vehicleRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> findAll(Long userId) {
        return vehicleRepository.findAllByUserIdOrderByIdDesc(userId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public VehicleResponse create(Long userId, VehicleRequest request) {
        if (vehicleRepository.existsByVehicleNumberIgnoreCaseAndUserId(request.vehicleNumber().trim(), userId)) {
            throw new IllegalArgumentException("This vehicle number is already registered to your account.");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found."));
        Vehicle vehicle = new Vehicle();
        vehicle.setUser(user);
        apply(vehicle, request);
        return toResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public VehicleResponse update(Long userId, Long id, VehicleRequest request) {
        Vehicle vehicle = getOwned(userId, id);
        apply(vehicle, request);
        return toResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        vehicleRepository.delete(getOwned(userId, id));
    }

    @Transactional(readOnly = true)
    public Vehicle getOwned(Long userId, Long id) {
        return vehicleRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Vehicle not found."));
    }

    private void apply(Vehicle vehicle, VehicleRequest request) {
        vehicle.setVehicleNumber(request.vehicleNumber().trim().toUpperCase());
        vehicle.setVehicleType(request.vehicleType());
        vehicle.setBrand(request.brand().trim());
        vehicle.setModel(request.model().trim());
        vehicle.setPurchaseDate(request.purchaseDate());
        vehicle.setCurrentMileage(request.currentMileage());
        vehicle.setModelYear(request.modelYear());
        vehicle.setVariant(trim(request.variant()));
        vehicle.setFuelType(trim(request.fuelType()));
        vehicle.setInsuranceExpiry(request.insuranceExpiry());
        vehicle.setTyreCondition(trim(request.tyreCondition()));
        vehicle.setTyreReplacementDate(request.tyreReplacementDate());
        vehicle.setBatteryDate(request.batteryDate());
        vehicle.setEngineOil(trim(request.engineOil()));
        vehicle.setNotes(trim(request.notes()));
    }

    private VehicleResponse toResponse(Vehicle v) {
        return new VehicleResponse(v.getId(), v.getVehicleNumber(), v.getVehicleType(), v.getBrand(), v.getModel(),
                v.getPurchaseDate(), v.getCurrentMileage(), v.getModelYear(), v.getVariant(), v.getFuelType(), v.getInsuranceExpiry(),
                v.getTyreCondition(), v.getTyreReplacementDate(), v.getBatteryDate(), v.getEngineOil(), v.getNotes());
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}
