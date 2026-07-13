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

- Connect this GitHub repo to Render as a Web Service.
- Root directory: `apps/api` **or** use the root `render.yaml`.
- Build: `cd ../.. && npm install && npm run build -w @gymeasure/shared && npm run build -w @gymeasure/api`
- Start: `npm run start -w @gymeasure/api` (from monorepo root) — or see `render.yaml`.
- Env: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`.

Free Render web services sleep after idle; the app calls `/health` on launch to wake the API.

## Android APK (EAS)

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli init
# set extra.eas.projectId in app.json
EXPO_PUBLIC_API_URL=https://YOUR-RENDER-URL npx eas-cli build -p android --profile preview
```

Share the APK with your buddy, create accounts, exchange invite codes on the Buddies tab.
