package com.VehicleServiceReminder.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "vehicle_visual_assets",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_vehicle_visual_signature",
        columnNames = {"vehicle_id", "make", "model", "model_year", "color"}
    ),
    indexes = @Index(name = "idx_vehicle_visual_vehicle", columnList = "vehicle_id")
)
public class VehicleVisualAsset {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Column(nullable = false, length = 80)
    private String make;

    @Column(nullable = false, length = 80)
    private String model;

    @Column(name = "model_year", nullable = false)
    private Integer modelYear;

    @Column(nullable = false, length = 30)
    private String color;

    @Column(name = "provider_request_id", length = 100, unique = true)
    private String providerRequestId;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    @Column(name = "public_model_id", length = 100)
    private String publicModelId;

    @Column(nullable = false, length = 20)
    private String status = "NONE";

    @Column(nullable = false)
    private Integer progress = 0;

    @Column(length = 700)
    private String message;

    private Integer creditsCharged;
    private Integer creditsRemaining;
    private Boolean alreadyOwned;
    private Long estimatedSecondsRemaining;

    @Lob
    @Column(name = "signed_frames_json", columnDefinition = "LONGTEXT")
    private String signedFramesJson;

    @Column(name = "frames_expires_at")
    private LocalDateTime framesExpiresAt;

    // One-frame showroom preview. Kept separate from the eight-angle spin cache.
    @Column(name = "hero_image_url", length = 2000)
    private String heroImageUrl;

    @Column(name = "hero_image_expires_at")
    private LocalDateTime heroImageExpiresAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void beforeInsert() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void beforeUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Vehicle getVehicle() { return vehicle; }
    public void setVehicle(Vehicle vehicle) { this.vehicle = vehicle; }
    public String getMake() { return make; }
    public void setMake(String make) { this.make = make; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public Integer getModelYear() { return modelYear; }
    public void setModelYear(Integer modelYear) { this.modelYear = modelYear; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getProviderRequestId() { return providerRequestId; }
    public void setProviderRequestId(String providerRequestId) { this.providerRequestId = providerRequestId; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getPublicModelId() { return publicModelId; }
    public void setPublicModelId(String publicModelId) { this.publicModelId = publicModelId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getProgress() { return progress; }
    public void setProgress(Integer progress) { this.progress = progress; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Integer getCreditsCharged() { return creditsCharged; }
    public void setCreditsCharged(Integer creditsCharged) { this.creditsCharged = creditsCharged; }
    public Integer getCreditsRemaining() { return creditsRemaining; }
    public void setCreditsRemaining(Integer creditsRemaining) { this.creditsRemaining = creditsRemaining; }
    public Boolean getAlreadyOwned() { return alreadyOwned; }
    public void setAlreadyOwned(Boolean alreadyOwned) { this.alreadyOwned = alreadyOwned; }
    public Long getEstimatedSecondsRemaining() { return estimatedSecondsRemaining; }
    public void setEstimatedSecondsRemaining(Long estimatedSecondsRemaining) { this.estimatedSecondsRemaining = estimatedSecondsRemaining; }
    public String getSignedFramesJson() { return signedFramesJson; }
    public void setSignedFramesJson(String signedFramesJson) { this.signedFramesJson = signedFramesJson; }
    public LocalDateTime getFramesExpiresAt() { return framesExpiresAt; }
    public void setFramesExpiresAt(LocalDateTime framesExpiresAt) { this.framesExpiresAt = framesExpiresAt; }
    public String getHeroImageUrl() { return heroImageUrl; }
    public void setHeroImageUrl(String heroImageUrl) { this.heroImageUrl = heroImageUrl; }
    public LocalDateTime getHeroImageExpiresAt() { return heroImageExpiresAt; }
    public void setHeroImageExpiresAt(LocalDateTime heroImageExpiresAt) { this.heroImageExpiresAt = heroImageExpiresAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
