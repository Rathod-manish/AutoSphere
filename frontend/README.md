# AutoSphere V6 — Responsive Vehicle Studio

## What the visual layer does

- Every saved car/bike gets an immediate interactive Three.js representative model; the stage does not wait for a remote provider.
- The generated model follows the saved vehicle type, make/model tokens and selected paint color, with desktop mouse and mobile touch controls plus a static SVG fallback.
- A matched Sketchfab model is an optional community reference and is labelled as such; catalog matches do not certify the exact trim/year.
- **Load 360 views** is a user action. It warns that the provider may charge up to eight image credits, then requests the authenticated vehicle's signed image set. The backend stores its signed frame cache in Aiven; the frontend also caches it locally.
- **Generate catalog 3D** appears only when the backend has `CAR_IMAGE_API_KEY` configured and a model year is saved. A confirmation warns that a new make/model/year/color may cost provider credits and generation may take 10–20 minutes. Local 3D remains available while generation runs.
- The frontend never gets a Gemini, Aiven, or vehicle-visual API key.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`; backend default is `http://localhost:8082`.

Set `VITE_API_BASE_URL=http://localhost:8082/api` in `.env.local` if needed. Do not put secret API keys in Vite environment variables.

## Limits stated honestly

Local geometry is representative and not a vehicle manufacturer's exact CAD. The hosted provider may not list every model year/trim worldwide. When an exact external model cannot be loaded, the local 3D profile stays visible and the dashboard must not pretend that a different model is the owner's vehicle.


## Real catalog image (optional free evaluation quota)

The dashboard has a **Get real vehicle image · 1 credit** button that requires an explicit confirmation. It asks the backend for one make/model/year image and caches the signed URL for up to five days. Configure `CAR_IMAGE_API_KEY` only on the Spring Boot backend. The frontend never receives this key.

The free evaluation tier currently starts with 100 image credits, subject to the provider's current plan and license restrictions. This button loads a static vehicle image; use the existing 360 button for eight camera angles. The actual generated 3D model endpoint has a separate 100-credit charge and is not represented as free.
