# FitMatch

**One profile. Every brand. The right fit.**

FitMatch turns one body-measurement profile into explainable size recommendations across brands, categories and individual products. It is the layer between a person's measurements and the brands they shop from, not a store.

```
apps/
  api/   Express 5 + TypeScript REST API, PostgreSQL (pg), recommendation engine, tests
  web/   Next.js 15 (App Router) + TypeScript + Tailwind v4 + Framer Motion + Lucide
```

## Quick start

Requires Node 20+.

```bash
npm install
cp apps/api/.env.example apps/api/.env      # set ADMIN_PASSWORD, or one is generated and printed once
cp apps/web/.env.example apps/web/.env.local
npm run dev:api                              # http://localhost:4000
npm run dev:web                              # http://localhost:3000
```

With no `DATABASE_URL`, the API runs an **embedded PostgreSQL (PGlite)** in `apps/api/.pglite`. It migrates and seeds automatically on first boot, so the app works immediately. Point `DATABASE_URL` at Neon (or any Postgres) for real deployments:

```bash
DATABASE_URL=postgres://… npm run db:migrate
DATABASE_URL=postgres://… npm run db:seed     # demo catalogue + admin user from ADMIN_EMAIL/ADMIN_PASSWORD
npm run make-admin -w apps/api -- someone@example.com
```

Tests (engine unit tests and API integration tests against a real in-memory Postgres):

```bash
npm test
npm run typecheck
```

## What's in it

| Area | Where |
|---|---|
| Landing, brands, size guide, about, legal, help | `apps/web/src/app/page.tsx`, `apps/web/src/app/(site)` |
| Sign up / login / forgot + reset password / email verification / optional Google | `apps/web/src/app/(auth)`, `apps/api/src/routes/auth.ts` |
| 5-step measurement wizard (live body diagram, per-field guidance, range validation, consistency checks, cm/in) | `apps/web/src/components/app/measurement-wizard.tsx` |
| Dashboard, measurements (multiple profiles, inline edit), size finder, cross-brand comparison, discovery, product detail, fit history + feedback, saved, settings | `apps/web/src/app/app` |
| Admin: brands, products, image upload, garment measurements, size charts with provenance and verification, category weights, feedback moderation, performance metrics | `apps/web/src/app/admin`, `apps/api/src/routes/admin.ts` |
| Schema | `apps/api/db/migrations/001_initial_schema.sql` |

## Recommendation engine

`apps/api/src/engine/` is pure and stateless. The input and output are plain JSON (`EngineInput` → `EngineResult`).

1. **Gate on required measurements** per category (from `clothing_categories.required_measurements`). Missing ones return `missing_measurements` rather than a guess.
2. **Choose the data.** Use product garment measurements when they cover enough of the category's weighted points; otherwise fall back to the brand's category size chart. If neither does, or the data was rejected in review, it returns *"Insufficient product sizing information for a reliable recommendation."*
3. **Weighted, normalised distance per size.**
   - *Garment data:* target = body + wearing ease for the product's fit type (slim/regular/relaxed/oversized), shifted toward the user's preference. Waistbands get almost no ease. `|garment − target| / tolerance`, with tightness penalised more than looseness and forgiven by fabric stretch.
   - *Body charts:* in range scores ≈ 0 (with a small centrality term); out of range scores by distance over tolerance.
   - Points are combined with category weights (e.g. tees: chest .5, shoulder .3, waist .2). Chest never decides alone.
4. **Output:** best size, an alternative when it's close (with the trade-off explained), per-measurement comparison, length and inseam warnings, and a **qualitative** match quality and confidence. Confidence is built from explicit, listed reasons (data basis, verification, coverage, gap between sizes, measurement method). No percentages are fabricated.
5. **Feedback, applied carefully.** A user's own latest feedback for a brand and category nudges *their* target (capped at ±1.5 cm). Product-wide adjustments need **≥ 5 distinct users** with active (non-excluded) feedback and are capped at ±2 cm. One review can't redefine sizing.

`ENGINE_MODE=remote` + `RECOMMENDER_URL` sends the same JSON to an external service (e.g. a future FastAPI model) via `POST /recommend`, falling back to the deterministic engine on any failure.

## Data honesty

- **All seeded size charts and garment measurements are demonstration data**, approximated and not taken from the brands' published charts. They're stored with `is_demo = true` and `verification_status = 'unverified'`, and labelled "Demo data" everywhere in the UI. The API refuses to mark demo data as verified.
- Every chart and garment value carries **source, collection date and verification status**. Only verified data (which needs a source URL) is labelled "Officially verified", and editing a chart's values resets it to unverified.
- Products have no live stock or prices. "Shop" links open the brand's website, and demo products say so.
- Products without photography render as technical flat sketches. Admins can add https image URLs or upload to Cloudinary.

## Security notes

- Session auth: random 256-bit token in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production). Only its SHA-256 is stored. Sliding 30-day expiry.
- Passwords hashed with scrypt. Reset and verify tokens are single-use, hashed and short-lived. Password reset revokes other sessions.
- Origin check on state-changing requests, rate limiting on auth endpoints, Helmet headers, `Cache-Control: private, no-store` on all API responses, zod validation on every input, and constraint errors mapped to safe messages.
- The web app proxies `/api/*` to the API (`next.config.ts` rewrites), so cookies stay first-party on the web origin.
- Account deletion cascades to every profile, measurement, recommendation and piece of feedback.

## Deployment

- **Database (Neon):** create a database and set `DATABASE_URL` (with `sslmode=require`). Run `npm run db:migrate`, then `npm run db:seed` if you want the demo catalogue.
- **API (Railway):** root `apps/api`, build `npm run build`, start `npm start`. Set `NODE_ENV=production`, `DATABASE_URL`, `APP_ORIGIN` (the web URL), and `ALLOWED_ORIGINS`. Optionally set `GOOGLE_CLIENT_ID/SECRET` (redirect URI `${APP_ORIGIN}/api/auth/google/callback`) and `CLOUDINARY_*`.
- **Web (Vercel):** root `apps/web`, env `API_URL` = the Railway URL.

## Known gaps

- **Email delivery** uses a console transport. Outside production, the verification and reset links are also returned to the UI so the flows work locally. Plug a provider into `apps/api/src/lib/mailer.ts` before launch.
- **Google sign-in** is implemented (authorization-code flow with state check) but is hidden until credentials are configured, and it hasn't been exercised against Google here.
- **Cloudinary uploads** use signed direct uploads and are disabled until `CLOUDINARY_*` is set. Not exercised against Cloudinary here.
- The demo catalogue is menswear-only, so womenswear users fall back to the same charts.
- Frontend has no automated tests yet. Coverage is the engine and API suites, plus manual browser walkthroughs.
