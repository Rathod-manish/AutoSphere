package com.VehicleServiceReminder.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "vehicles")
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String vehicleNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private VehicleType vehicleType;

    @Column(nullable = false, length = 80)
    private String brand;

    @Column(nullable = false, length = 80)
    private String model;

    private LocalDate purchaseDate;

    @Column(nullable = false)
    private Integer currentMileage;

    @Column(name = "model_year")
    private Integer modelYear;

    @Column(length = 80)
    private String variant;

    @Column(length = 30)
    private String fuelType;

    private LocalDate insuranceExpiry;

    @Column(length = 30)
    private String tyreCondition;

    private LocalDate tyreReplacementDate;

    private LocalDate batteryDate;

    @Column(length = 50)
    private String engineOil;

    @Column(length = 1200)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "vehicle", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private List<VehicleVisualAsset> visualAssets = new ArrayList<>();

    public Vehicle() {}

    public Long getId() { return id; }
    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }
    public VehicleType getVehicleType() { return vehicleType; }
    public void setVehicleType(VehicleType vehicleType) { this.vehicleType = vehicleType; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public LocalDate getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(LocalDate purchaseDate) { this.purchaseDate = purchaseDate; }
    public Integer getCurrentMileage() { return currentMileage; }
    public void setCurrentMileage(Integer currentMileage) { this.currentMileage = currentMileage; }
    public Integer getModelYear() { return modelYear; }
    public void setModelYear(Integer modelYear) { this.modelYear = modelYear; }
    public String getVariant() { return variant; }
    public void setVariant(String variant) { this.variant = variant; }
    public String getFuelType() { return fuelType; }
    public void setFuelType(String fuelType) { this.fuelType = fuelType; }
    public LocalDate getInsuranceExpiry() { return insuranceExpiry; }
    public void setInsuranceExpiry(LocalDate insuranceExpiry) { this.insuranceExpiry = insuranceExpiry; }
    public String getTyreCondition() { return tyreCondition; }
    public void setTyreCondition(String tyreCondition) { this.tyreCondition = tyreCondition; }
    public LocalDate getTyreReplacementDate() { return tyreReplacementDate; }
    public void setTyreReplacementDate(LocalDate tyreReplacementDate) { this.tyreReplacementDate = tyreReplacementDate; }
    public LocalDate getBatteryDate() { return batteryDate; }
    public void setBatteryDate(LocalDate batteryDate) { this.batteryDate = batteryDate; }
    public String getEngineOil() { return engineOil; }
    public void setEngineOil(String engineOil) { this.engineOil = engineOil; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
