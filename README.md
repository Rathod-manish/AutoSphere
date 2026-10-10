# AutoSphere — Complete Full-Stack Project (Matched Source Set)

This package contains the React/Vite frontend and Spring Boot backend from one matched version. Use this complete set rather than copying only `VehicleVisualService.java` from one version into a different backend.

## Current STS error: `VehicleVisualAsset cannot be resolved`

The backend must include all three matching source files:

```text
backend/src/main/java/com/VehicleServiceReminder/AI/VehicleVisualService.java
backend/src/main/java/com/VehicleServiceReminder/Entity/VehicleVisualAsset.java
backend/src/main/java/com/VehicleServiceReminder/Repository/VehicleVisualAssetRepository.java
```

The last two files are required by `VehicleVisualService.java`, and `Vehicle.java` also declares the relationship to `VehicleVisualAsset`. The screenshot's error list showed those classes missing from the STS source tree. This package contains all three files at the correct paths.

## Run your existing backend in STS

The project root is `backend/`. To repair your existing `D:\backend` project rather than create a new application:

1. Stop Spring Boot in STS.
2. From this package, copy `backend/src/main/java/com/VehicleServiceReminder/Entity/VehicleVisualAsset.java` to the same relative path under `D:\backend\src\main\java\com\VehicleServiceReminder\Entity\`.
3. Copy `backend/src/main/java/com/VehicleServiceReminder/Repository/VehicleVisualAssetRepository.java` to the same relative path under `D:\backend\src\main\java\com\VehicleServiceReminder\Repository\`.
4. Keep `VehicleVisualService.java` from this same package at `D:\backend\src\main\java\com\VehicleServiceReminder\AI\VehicleVisualService.java`. Do not keep two copies of the same class.
5. In STS press `F5` on the project. Right-click the existing `backend` project → **Maven → Update Project** → OK. Then **Project → Clean**.
6. If red errors remain, close STS, delete only `D:\backend\target` (never `src`), reopen STS, run **Maven → Update Project**, **Project → Clean**, then run `VehicleServiceReminderApplication`.

Do not delete your source files, change Aiven credentials, create a second project, or manually edit the 30 cascading errors one by one.

## Backend configuration

- Local port: `8082` (unless the deployment host supplies `PORT`).
- Aiven MySQL: configured in `backend/src/main/resources/application.properties` using the existing Aiven host; set `AIVEN_MYSQL_PASSWORD` in STS Run Configurations → Environment.
- Gemini key is optional for backend startup; set `GEMINI_API_KEY` to enable real AI requests.
- Vehicle-visual provider key is optional; set `CAR_IMAGE_API_KEY` for catalog images/360/model services. Without it, the local generated interactive 3D representation remains available.
- Never commit real passwords/API keys.

## Start frontend

Open a terminal in `frontend/`:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Set `VITE_API_BASE_URL=http://localhost:8082/api` in `frontend/.env.local` only if you need to override the documented default. No private keys belong in `VITE_*` variables.

## Current verification status

- Frontend JavaScript/JSX syntax parsing: 11 files, 0 parse errors.
- Backend internal `com.VehicleServiceReminder.*` imports: all resolve inside the packaged source tree, including `VehicleVisualAsset` and `VehicleVisualAssetRepository`.
- Complete Vite build / Maven `clean verify`: not run successfully in this environment because the npm registry lookup failed (`EAI_AGAIN`) and Maven is not installed here. After download, `npm install` and the Maven build can run on your machine/STS.
