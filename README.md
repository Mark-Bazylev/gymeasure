# Gymeasure

Private-circle gym app for you and your Gym Buddies: build Training Days, log Sessions, track Volume, Compare progress.

## Stack

- **Mobile:** Expo + NativeWind (`apps/mobile`) — Android APK via EAS
- **API:** Express + Drizzle (`apps/api`) on Render
- **DB:** Neon Postgres
- **Shared:** Zod schemas (`packages/shared`)

See [CONTEXT.md](./CONTEXT.md) for domain language and [docs/adr](./docs/adr) for decisions.

## Local setup

1. Copy `apps/api/.env.example` → `apps/api/.env` and set `DATABASE_URL` (Neon) + `JWT_SECRET`.
2. Install and build shared types:

```bash
npm install
npm run build -w @gymeasure/shared
```

3. Push schema / migrate:

```bash
npm run db:push
# or: npm run db:migrate
```

4. Run API + mobile:

```bash
npm run dev:api
# other terminal
EXPO_PUBLIC_API_URL=http://localhost:4000 npm run dev:mobile
```

On a physical Android device, use your machine LAN IP instead of `localhost`.

## Deploy API (Render)

See [docs/DEPLOY.md](./docs/DEPLOY.md) for Neon + Render + EAS APK steps.

Quick path: connect this GitHub repo on Render via `render.yaml`, set `DATABASE_URL` (Neon) and `JWT_SECRET`, then build an Android APK with EAS using `EXPO_PUBLIC_API_URL` pointed at the Render URL.
