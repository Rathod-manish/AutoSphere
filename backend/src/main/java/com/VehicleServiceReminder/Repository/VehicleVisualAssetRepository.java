package com.VehicleServiceReminder.Repository;

import com.VehicleServiceReminder.Entity.VehicleVisualAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface VehicleVisualAssetRepository extends JpaRepository<VehicleVisualAsset, Long> {
    Optional<VehicleVisualAsset> findByVehicle_IdAndMakeIgnoreCaseAndModelIgnoreCaseAndModelYearAndColorIgnoreCase(
            Long vehicleId, String make, String model, Integer modelYear, String color);
    void deleteAllByVehicle_Id(Long vehicleId);
}
