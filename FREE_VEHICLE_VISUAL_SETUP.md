# AutoSphere: free catalog vehicle visuals setup

## Short answer

There is no reliable, unlimited, forever-free API that generates exact OEM 3D car and motorcycle models for every make, model, trim, and year. AutoSphere now integrates a more practical hybrid:

1. A free local Three.js model is always available and can be rotated on desktop/mobile.
2. Optional Car Image API images match the owner's make/model/year against a catalogue. Its published free evaluation tier starts with **100 image credits and no card**.
3. One real catalog image costs **1 image credit**. Eight-angle 360 uses up to **8 image credits** when frames are newly requested.
4. The provider's actual generated GLB/3D mesh costs **100 credits** per new vehicle/color according to the provider's current docs; do not assume generated 3D is free.
5. Meshy offers free credits/downloads in its web app, but Meshy documents API generation as a separate pay-before-you-go product. This is therefore not wired as a supposedly free API.

The Car Image API free plan is described for evaluation and personal projects; verify its terms before public/commercial launch. Pricing and quotas can change.

## Enable one-image preview

1. Go to https://carimage.dev/docs and create a key. Check https://carimage.dev/pricing for the current free quota, eligible markets, and licence limitations.
2. In STS open **Run → Run Configurations → Spring Boot App → VehicleServiceReminderApplication → Environment**.
3. Add `CAR_IMAGE_API_KEY` with the key value. Do not put it in React, any `VITE_*` variable, source control, or chat.
4. Keep the existing Aiven/Gemini environment values unchanged. Click **Apply**, stop the old backend, and run it again.
5. Open AutoSphere, select a saved vehicle with make, model and model year, then click **Get real vehicle image · 1 credit**. Confirm the prompt. The API key remains on the backend; the browser receives only a short-lived signed image URL.
6. That result is cached in the backend database and the browser for five days. Reopening the dashboard during that time should not order another image.

## 360 and full 3D

- **Load 360 views**: the user confirms before requesting eight views. A new eight-frame set can use up to eight image credits.
- **Generate catalog 3D**: a separate action with its own cost confirmation. The currently documented price is 100 credits per new 3D model. It may take several minutes to generate.
- If the catalog cannot match the vehicle or the provider key is missing, use **Interactive 3D**. That local geometry is representative, not an exact factory CAD model.

## Server API added in this update

`POST /api/vehicle-visuals/vehicles/{vehicleId}/hero`

Body:

```json
{ "color": "silver", "confirmCredit": true }
```

Requires JWT authentication and ownership of the saved vehicle. The backend refuses to request an image until `confirmCredit` is true, and returns a cached URL while its cache is valid.

## Official provider sources

- Pricing: https://carimage.dev/pricing
- Images API: https://carimage.dev/docs/images
- Signed URL API: https://carimage.dev/docs/signed-urls
- 3D models: https://carimage.dev/docs/3d
- Meshy API pricing: https://docs.meshy.ai/en/api/pricing
- Meshy web free plan: https://help.meshy.ai/en/articles/15696428-what-is-included-on-the-free-plan
