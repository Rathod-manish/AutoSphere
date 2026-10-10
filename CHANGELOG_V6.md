# Changelog — AutoSphere V6

- Added an always-visible procedural Three.js model for every saved vehicle make/model, with static SVG fallback.
- Prefer an exact-token curated community model when present; label the model as community-created and preserve attribution/source links.
- Added a server-backed optional provider-generated 3D lifecycle stored in Aiven MySQL, tied to the owner's saved vehicle and protected by ownership checks.
- Added explicit cost confirmations before requesting 3D generation or eight 360 images. Dashboard load makes no billable visual calls.
- Added browser caching and five-day server-side caching of signed 360 frames.
- Added safe idempotent retry behavior for uncertain provider 3D requests.
- Improved mobile toolbar overflow, hosted-view touch behavior, local viewer gestures and fallback messages.
- Added a GitHub Actions workflow to build the Vite frontend and run Maven verification.
- Default the vehicle stage to the local interactive 3D representation even when a community iframe exists; third-party embeds are optional because browser/privacy/network policy can prevent them from rendering.

## V6.1 — Free catalog hero image option

- Added owner-authenticated `POST /api/vehicle-visuals/vehicles/{vehicleId}/hero` endpoint.
- Added server-side signed URL caching for a single front three-quarter catalog image, separate from the existing eight-angle spin cache.
- Added a user-confirmed one-image request in the dashboard with clear credit messaging.
- Added browser-side cache and vehicle-ID guards so image state does not leak between a user's saved cars/bikes.
- Kept local Three.js 3D as the default and fallback; external images are static renders, not interactive geometry.
- Added responsive controls for the vehicle stage.
- Added free-tier setup and cost/licensing limitations to `FREE_VEHICLE_VISUAL_SETUP.md`.
