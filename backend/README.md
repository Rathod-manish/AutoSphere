# AutoSphere V6 — Spring Boot Backend

This backend keeps the existing authentication, vehicle, service-history, reminder and Gemini AI features, and adds a secure vehicle-visual service.

## New fields
`vehicles.model_year` stores the exact model year entered by the user. Hibernate `ddl-auto=update` adds the nullable column automatically.

## New owner-authenticated endpoints
- `GET /api/vehicle-visuals/vehicles/{vehicleId}/model?color=silver` — reads saved catalog-model state and performs free status polling while generation is processing.
- `POST /api/vehicle-visuals/vehicles/{vehicleId}/model` with `{ "color": "silver", "confirmCost": true }` — requests provider-generated 3D only after the owner explicitly confirms the possible charge.
- `POST /api/vehicle-visuals/vehicles/{vehicleId}/hero` with `{ "color": "silver", "confirmCredit": true }` — requests one signed hero image (one image credit) after explicit confirmation; result is cached for five days.
- `GET /api/vehicle-visuals/vehicles/{vehicleId}/spin?color=silver` — requests eight signed exterior images after an explicit user action.

Every endpoint verifies the requested vehicle belongs to the authenticated user. The API key remains server-side. The frontend does not request billable images or a billable generated model simply because the dashboard loaded.

Provider-generated 3D may cost up to 100 credits for a new make/model/year/color and can take around 10–20 minutes. The app must keep the local interactive fallback visible during generation. Check the provider's current prices/credits before using it.

## STS environment variables
Required for the existing stack:

- `AIVEN_MYSQL_PASSWORD`
- `GEMINI_API_KEY`

Optional for real multi-angle vehicle visuals:

- `CAR_IMAGE_API_KEY`

The visual feature is optional. If `CAR_IMAGE_API_KEY` is empty or the catalog cannot find the saved make/model/year, the frontend still shows an interactive locally generated representative 3D car/bike. Such geometry is not factory-exact CAD. When a provider model is ready, the user can choose it without losing the local fallback.

## Run
Use the existing STS Spring Boot run configuration on port 8082.


### Free image credits
The provider's current pricing page advertises a no-card evaluation plan starting with 100 image credits for personal/evaluation use. One hero image costs one credit; a fresh eight-angle request may use up to eight. A catalog-generated 3D model is a separate 100-credit request. These quotas/prices and license terms can change; verify the provider's current terms before deployment.
