# Gymeasure

Private-circle gym app for you and your Gym Buddies: build Training Days, log Sessions, track Volume, Compare progress.

## Stack

- **Mobile:** Expo + NativeWind + Lucide (`apps/mobile`) — Android APK via EAS
- **API:** Express + Drizzle (`apps/api`) on Render
- **DB:** Neon Postgres
- **Catalog media:** Cloudflare R2 (local `/media` fallback)
- **Shared:** Zod schemas (`packages/shared`)

See [CONTEXT.md](./CONTEXT.md) for domain language and [docs/adr](./docs/adr) for decisions.

## Local setup

1. Copy `apps/api/.env.example` → `apps/api/.env` and set `DATABASE_URL` (Neon) + `JWT_SECRET`.
2. Copy `apps/mobile/.env.example` → `apps/mobile/.env` and set `EXPO_PUBLIC_API_URL`.
3. Install and build shared types:

```bash
npm install --legacy-peer-deps
npm run build -w @gymeasure/shared
```

4. Migrate schema and import the owned exercise catalog:

```bash
npm run db:migrate
npm run catalog:import -w @gymeasure/api
```

5. Run API + mobile (dev client):

```bash
npm run dev:api
# other terminal
npm run start:dev -w @gymeasure/mobile
```

On a physical Android device, use your machine LAN IP instead of `localhost`. Rebuild the native app after adding SecureStore / Google Sign-In plugins.

## Deploy

See [docs/DEPLOY.md](./docs/DEPLOY.md) for Neon + Render + R2 + Google + EAS steps.
