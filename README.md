<div align="center">

# FitMatch

### One profile. Every brand. The right fit.

A size-intelligence platform that turns one set of body measurements into explainable
size recommendations across fashion brands, markets and individual products.

![Next.js](https://img.shields.io/badge/Next.js_15-171717?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Tests](https://img.shields.io/badge/tests-42_passing-527A60?style=flat-square)

<img src="docs/screenshots/landing.jpg" alt="FitMatch landing page" width="860" />

</div>

---

## Why FitMatch

A medium is a label, not a measurement. Two brands can grade the same size several centimetres apart, and the same brand can publish different charts in India, the US and the UK. FitMatch stores your measurements once and does the translation, size by size, brand by brand, market by market, and it always shows its working.

## Highlights

| | |
|---|---|
| **Measurement profile** | A five-step guided wizard with a live body diagram, how-to-measure help, range validation and a cm/inch switch. Supports multiple profiles. |
| **Explainable recommendations** | A weighted, multi-measurement engine. Chest alone never decides a size. Each result comes with an alternative size, per-measurement comparison and a plain-language confidence rating (never a made-up percentage). |
| **Cross-brand comparison** | Your size in every brand for a category on one screen, or start from *"I wear M in H&M"*. |
| **Real brand charts** | 88 men's size charts transcribed from official brand websites, each with its source link, date and review status. |
| **Three markets** | India, United States, UK & Europe, each with its own size charts, local-currency prices (₹ · $ · £) and the brand's regional store. |
| **Honest data** | Demonstration data is labelled everywhere. Missing data says *"Insufficient product sizing information"* rather than guessing. |
| **Fit feedback loop** | Your feedback personalises your own results. Product-wide changes need five or more shoppers to agree, and are capped. |
| **Admin panel** | Brands, products, garment measurements, size charts (with provenance and verification), category weights, prices per market and feedback moderation. |
| **Themes** | Warm editorial Light and a two-tone Contrast theme, contrast-checked to WCAG AA. |

<table>
  <tr>
    <td><img src="docs/screenshots/dashboard-contrast.jpg" alt="Dashboard in the Contrast theme" /></td>
    <td><img src="docs/screenshots/size-result-contrast.jpg" alt="Size recommendation with measurement comparison" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Dashboard · Contrast theme</sub></td>
    <td align="center"><sub>Size result with measurement comparison</sub></td>
  </tr>
</table>

## Quick start

> Requires **Node.js 20+**. No database install is needed for local development.

```bash
git clone https://github.com/aryan45sandilya/FITMATCH.git
cd FITMATCH
npm install

cp src/api/.env.example src/api/.env        # set ADMIN_PASSWORD, or one is generated and printed once
cp src/web/.env.example src/web/.env.local

npm run dev:api                              # API  → http://localhost:4000
npm run dev:web                              # Web  → http://localhost:3000
```

Without a `DATABASE_URL`, the API runs an **embedded PostgreSQL (PGlite)** in `src/api/.pglite`. It migrates and seeds itself on first boot.

<details>
<summary><b>Use a real PostgreSQL / Neon database</b></summary>

```bash
# in src/api/.env
DATABASE_URL=postgres://user:password@host/fitmatch?sslmode=require
```

```bash
npm run db:migrate
npm run db:seed                                   # demo catalogue, sourced charts, admin user
npm run make-admin -w src/api -- you@example.com  # promote an existing account
```
</details>

### Scripts

| Command | What it does |
|---|---|
| `npm run dev:api` / `npm run dev:web` | Start the API / website in watch mode |
| `npm test` | Engine unit tests and API integration tests (real in-memory Postgres) |
| `npm run typecheck` | Type-check both apps |
| `npm run build` | Production build of both apps |
| `npm run db:migrate` / `npm run db:seed` | Apply migrations / load seed data |

## Project structure

```
FITMATCH/
├── src/
│   ├── api/                       Express 5 REST API (TypeScript)
│   │   ├── db/migrations/         SQL migrations (001 schema → 004 store links)
│   │   └── src/
│   │       ├── engine/            Recommendation engine (pure, unit-tested)
│   │       ├── routes/            auth · profiles · catalog · recommend · me · admin
│   │       ├── services/          Data loading, market selection, catalogue queries
│   │       ├── db/                Connection, migrator, seed + sourced brand charts
│   │       └── middleware/        Sessions, auth guards, origin checks
│   └── web/                       Next.js 15 App Router website
│       └── src/
│           ├── app/               Pages: landing, auth, onboarding, app, admin
│           ├── components/        UI kit, app views, illustrations, admin tools
│           └── lib/               API client, session, units, labels, theme
└── docs/screenshots/              README images
```

## How a size is chosen

1. **Check the essentials.** Each category lists required measurements. If one is missing, you're asked for it instead of getting a guess.
2. **Pick the best data.** The product's garment measurements first, then the brand's chart for your market, then another market's chart (with a note), then labelled demo data.
3. **Score every size.** The engine compares each measurement with the size's range, or with the garment plus the ease for its cut. It allows for fit preference and fabric stretch, treats tight as worse than loose, and weights the measurements by category.
4. **Explain it.** You get the recommended size, a close alternative and its trade-off, a per-measurement comparison, and a confidence rating with its reasons.

## Data and honesty

- **Brand charts** come from official brand size guides, with their source URL and date, and are marked *pending review* until verified. Zara and Uniqlo stay on labelled demo data.
- **Catalogue products, garment measurements and prices** are **demonstration data**, labelled throughout the app.
- **Brand names** are for identification only. FitMatch is independent of all brands.

## Deployment

Everything runs on **Vercel**: two projects from this repo plus a Neon Postgres database from the Vercel Marketplace.

| Part | Vercel project | Root directory | Environment variables |
|---|---|---|---|
| Database | Storage → Neon (Marketplace) | — | Adds `DATABASE_URL` to the API project |
| API | `fitmatch-api` | `src/api` | `NODE_ENV=production`, `APP_ORIGIN`, `ALLOWED_ORIGINS`, `DATABASE_URL` |
| Web | `fitmatch-web` | `src/web` | `API_URL` |

**1. API project.** Import the repo in Vercel, set Root Directory to `src/api` and leave the framework as *Other*. [`src/api/vercel.json`](src/api/vercel.json) builds the TypeScript and routes every request to the Express app in [`src/api/api/index.js`](src/api/api/index.js).

**2. Database.** In the API project, open *Storage → Create → Neon*, then connect it. That adds `DATABASE_URL`. Copy it and run the migrations and seed **once** from your machine:

```bash
DATABASE_URL="postgres://..." ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a-long-password" npm run db:seed
```

`db:seed` applies the migrations first. Later schema changes only need `npm run db:migrate`.

**3. Web project.** Import the repo again, set Root Directory to `src/web` (Next.js is detected), and set `API_URL` to the API URL, e.g. `https://fitmatch-api.vercel.app`. The site proxies `/api/*` to it, so the session cookie stays on the site's own domain.

**4. Finish the API.** Set `APP_ORIGIN` and `ALLOWED_ORIGINS` to the web URL, e.g. `https://fitmatch-web.vercel.app`, plus `NODE_ENV=production`, then redeploy the API.

`API_URL` is read when the site is built, so redeploy the web project after changing it.

## Roadmap

- [ ] Transactional email provider
- [ ] Verify the 88 sourced brand charts in the admin panel
- [ ] Real product catalogue with garment measurements
- [ ] Womenswear charts
- [ ] Frontend test suite
