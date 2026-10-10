package com.VehicleServiceReminder.Repository;

import com.VehicleServiceReminder.Entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findAllByUserIdOrderByIdDesc(Long userId);
    Optional<Vehicle> findByIdAndUserId(Long id, Long userId);
    boolean existsByVehicleNumberIgnoreCaseAndUserId(String vehicleNumber, Long userId);
}
