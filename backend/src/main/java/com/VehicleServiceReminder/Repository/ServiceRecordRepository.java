package com.VehicleServiceReminder.Repository;

import com.VehicleServiceReminder.Entity.ServiceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ServiceRecordRepository extends JpaRepository<ServiceRecord, Long> {
    List<ServiceRecord> findAllByVehicleIdOrderByServiceDateDesc(Long vehicleId);
    Optional<ServiceRecord> findByIdAndVehicleId(Long id, Long vehicleId);
    long countByVehicleId(Long vehicleId);
}
