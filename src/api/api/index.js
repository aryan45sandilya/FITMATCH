// Vercel serverless entry: Vercel runs `npm run build` (tsc → dist/), then serves
// every request through this function. Migrations and seeding run once from your
// machine against the production DATABASE_URL, never on a request.
import { createApp } from "../dist/app.js";

export default createApp();
