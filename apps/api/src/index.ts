import { createApp } from "./app.js";
import { config } from "./config.js";
import { getDb } from "./db/index.js";
import { migrate } from "./db/migrate.js";
import { seed, seedBrandMarketLinks, seedDemoPrices } from "./db/seed.js";

const db = await getDb();
await migrate(db);

// Embedded dev database: seed automatically on first boot so the app is usable immediately.
if (!config.databaseUrl) {
  const { rows } = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM brands");
  if (!rows[0]?.n) await seed(db, { adminEmail: process.env.ADMIN_EMAIL, adminPassword: process.env.ADMIN_PASSWORD });
  // Backfills per-market demo prices on existing local databases (idempotent).
  else {
    await seedDemoPrices(db);
    await seedBrandMarketLinks(db);
  }
}

const server = createApp().listen(config.port, () => {
  console.log(`FitMatch API on http://localhost:${config.port} (${config.databaseUrl ? "PostgreSQL" : "embedded PGlite"})`);
});

const shutdown = () => {
  server.close(() => void db.close().finally(() => process.exit(0)));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
