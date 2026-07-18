# Deploy checklist

## 1. Neon Postgres

1. Create a free project at https://console.neon.tech
2. Copy the connection string
3. From monorepo root:

```bash
export DATABASE_URL='postgresql://...neon.tech/neondb?sslmode=require'
export DATABASE_SSL=true
npm run db:migrate
```

Prefer `db:migrate` over `db:push` so `0001_core_refactor` runs cleanly.

## 2. Render API

1. https://dashboard.render.com → New → Blueprint → connect the repo
2. Or New Web Service from the repo using `render.yaml`
3. Set env vars:
   - `DATABASE_URL` (Neon)
   - `JWT_SECRET` (auto or custom)
   - `DATABASE_SSL=true`
   - `PUBLIC_API_URL=https://YOUR-RENDER-URL`
   - Optional Google: `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`
   - Optional R2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`
4. After deploy, note the URL e.g. `https://gymeasure-api.onrender.com`
5. Hit `/health` once (cold start may take ~30–60s)

## 3. Exercise catalog import

One-time (or periodic) import from wger into Gymeasure-owned storage:

```bash
export DATABASE_URL=...
export ALLOW_CATALOG_IMPORT=true
# With R2 configured (recommended for production):
export R2_ACCOUNT_ID=...
export R2_ACCESS_KEY_ID=...
export R2_SECRET_ACCESS_KEY=...
export R2_BUCKET=gymeasure-exercises
export R2_PUBLIC_BASE_URL=https://media.your-domain.com

# Without R2, images are stored under apps/api/media and served at /media/*
npm run catalog:import -w @gymeasure/api
```

Runtime search never calls wger — only the Gymeasure `exercises` table and hosted image URLs.

Preserve per-item Creative Commons attribution shown in the app.

## 4. Google Sign-In (Android)

1. Create OAuth clients in Google Cloud Console (Web + Android with SHA-1)
2. Set API `GOOGLE_WEB_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_ID`
3. Set mobile `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the **Web** client ID
4. Rebuild the native Android app (`expo run:android` or EAS) — Google Sign-In does not work in Expo Go
5. iOS Google + Sign in with Apple are deferred

## 5. Android APK (EAS)

```bash
cd apps/mobile
npx eas-cli login
EXPO_PUBLIC_API_URL=https://YOUR-RENDER-URL \
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=... \
npx eas-cli build -p android --profile preview
```

Refresh tokens live in SecureStore; access tokens are short-lived and rotate automatically.

## Local verification

```bash
npm run db:migrate
npm run catalog:import -w @gymeasure/api
npm run build -w @gymeasure/shared
npm run test -w @gymeasure/api
npm run dev:api
npm run start:dev -w @gymeasure/mobile
```
