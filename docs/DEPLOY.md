# Deploy checklist

## 1. Neon Postgres

1. Create a free project at https://console.neon.tech
2. Copy the connection string
3. From monorepo root:

```bash
export DATABASE_URL='postgresql://...neon.tech/neondb?sslmode=require'
export DATABASE_SSL=true
npm run db:push
```

## 2. Render API

1. https://dashboard.render.com → New → Blueprint → connect `Mark-Bazylev/gymeasure`
2. Or New Web Service from the repo using `render.yaml`
3. Set env vars: `DATABASE_URL` (Neon), `JWT_SECRET` (auto or custom), `DATABASE_SSL=true`
4. After deploy, note the URL e.g. `https://gymeasure-api.onrender.com`
5. Hit `/health` once (cold start may take ~30–60s)

## 3. Android APK (EAS)

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli init   # writes projectId into app.json
EXPO_PUBLIC_API_URL=https://YOUR-RENDER-URL npx eas-cli build -p android --profile preview
```

Install the APK on both phones → register → exchange invite codes on Buddies.

## Local verification (already done in this rebuild)

- Docker Postgres + `db:push`
- API smoke: register, link buddies, Training Day, Session, Volume, Compare
