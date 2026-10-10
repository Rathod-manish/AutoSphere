# AutoSphere V6 — Universal and honest vehicle visualization

## Visual resolution tiers

1. **Always-visible local 3D**: generated immediately in the browser from the currently selected, authenticated owner's stored vehicle record. Works without a visual provider key and supports car/bike silhouettes, color, rotation, zoom and hotspots.
2. **Saved catalog-generated 3D**: when the owner previously requested a hosted catalog model and it is ready, the app displays it only when its persisted asset belongs to the selected vehicle. Asset state is keyed by vehicle, make, model, model year and color.
3. **Requested 360 image set**: eight signed exterior angles can be loaded on the owner's explicit click and are cached locally. The page does not request these URLs during normal dashboard rendering.
4. **Curated community 3D**: a creator-hosted model can be offered only when the make/model token matches the saved vehicle. Its badge says community reference and notes that year/trim may differ.
5. **Fallback**: if WebGL or the external viewer fails, the user still has the procedural/SVG model and saved maintenance data. No unrelated vehicle is silently substituted.

## Ownership and cost controls

- All provider routes include the authenticated owner's `vehicleId` and call `VehicleService.getOwned()` before provider access.
- Provider API key stays on Spring Boot, never in the browser.
- GET model-state polling is automatic and designed to be non-billable.
- Generating a provider 3D model and requesting 360 frames are explicit user actions. The frontend explains estimated credits before requesting them.
- POST 3D requests use an idempotency key persisted in Aiven MySQL so a network retry can reuse the existing request.

## Exactness boundaries

- The local Three.js model is representative procedural geometry. It is not a factory-accurate mesh and cannot represent the exact external bodywork of all global trims/years.
- Provider-hosted generation is a rendered-image reconstruction, not OEM-certified CAD or a mechanical diagnosis.
- No worldwide public catalog guarantees all makes, models, model years, colors and trims. Missing provider catalog matches must not result in a misleading substitute; keep the local vehicle visible and explain the limit.

## Responsive interaction

- Desktop: drag rotation, mouse-wheel zoom, keyboard controls and auto-rotation.
- Mobile: touch drag, pinch zoom, touch-friendly view controls, horizontally scrollable compact toolbar, stacked dashboard cards and reduced-motion support.
- When the hosted 3D viewer is active, its viewport restores native touch interactions. Local Three.js handles its own pointer gestures.

## V6.1 optional single-image path

When the signed-in owner explicitly requests a catalog hero image, the frontend calls `POST /api/vehicle-visuals/vehicles/{vehicleId}/hero` and sends `confirmCredit: true` only after a browser confirmation. The backend checks vehicle ownership, asks Car Image API for one signed front 3/4 image URL, stores it in `vehicle_visual_assets.hero_image_url` with an expiry, and returns a browser-safe URL. Cached URLs are reused. This image is a static render; it is not misrepresented as the interactive local Three.js model or an OEM-certified exact trim render.
