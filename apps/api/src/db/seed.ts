import { pathToFileURL } from "node:url";
import { hashPassword, randomToken } from "../lib/crypto.js";
import { getDb, type Database } from "./index.js";
import { migrate } from "./migrate.js";
import {
  BRANDS,
  CATEGORIES,
  DEMO_COLLECTED_AT,
  DEMO_SOURCE,
  MEASUREMENT_POINTS,
  PRODUCTS,
  chartFor,
  garmentFor,
} from "./seed-data.js";

/** Idempotent: safe to run repeatedly; demo rows are upserted by natural keys. */
export async function seed(db: Database, opts: { adminEmail?: string; adminPassword?: string; log?: (m: string) => void } = {}) {
  const log = opts.log ?? console.log;

  await db.tx(async (q) => {
    for (const [i, p] of MEASUREMENT_POINTS.entries()) {
      await q.query(
        `INSERT INTO measurement_points (key, label, region, description, how_to_measure, min_cm, max_cm, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (key) DO UPDATE SET label=EXCLUDED.label, region=EXCLUDED.region, description=EXCLUDED.description,
           how_to_measure=EXCLUDED.how_to_measure, min_cm=EXCLUDED.min_cm, max_cm=EXCLUDED.max_cm, sort_order=EXCLUDED.sort_order`,
        [p.key, p.label, p.region, p.description, p.how, p.min, p.max, i],
      );
    }

    const categoryIds = new Map<string, number>();
    for (const [i, c] of CATEGORIES.entries()) {
      const { rows } = await q.query<{ id: number }>(
        `INSERT INTO clothing_categories (slug, name, garment_group, required_measurements, measurement_weights, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name
         RETURNING id`,
        [c.slug, c.name, c.group, c.required, JSON.stringify(c.weights), i],
      );
      categoryIds.set(c.slug, rows[0]!.id);
    }

    const brandIds = new Map<string, string>();
    const chartIds = new Map<string, string>();
    for (const b of BRANDS) {
      const { rows } = await q.query<{ id: string }>(
        `INSERT INTO brands (slug, name, country, website_url, description, sizing_notes)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name
         RETURNING id`,
        [b.slug, b.name, b.country, b.website, b.description, b.sizingNotes],
      );
      const brandId = rows[0]!.id;
      brandIds.set(b.slug, brandId);

      for (const cat of b.categories) {
        const sizes = chartFor(b, cat);
        if (!sizes.length) continue;
        const { rows: chartRows } = await q.query<{ id: string }>(
          `INSERT INTO brand_size_charts (brand_id, category_id, audience, name, measurement_basis, source, collected_at, is_demo, notes)
           VALUES ($1,$2,'menswear',$3,'body',$4,$5,true,$6)
           ON CONFLICT (brand_id, category_id, audience, name) DO UPDATE SET source=EXCLUDED.source
           RETURNING id`,
          [brandId, categoryIds.get(cat), `${b.name} ${CATEGORIES.find((c) => c.slug === cat)!.name} — demo chart`, DEMO_SOURCE, DEMO_COLLECTED_AT,
            "Generated for demonstration. Replace with the brand's published chart and verify before use."],
        );
        const chartId = chartRows[0]!.id;
        chartIds.set(`${b.slug}:${cat}`, chartId);
        for (const s of sizes) {
          for (const [key, r] of Object.entries(s.points)) {
            await q.query(
              `INSERT INTO size_chart_measurements (chart_id, size_label, sort_order, measurement_key, min_cm, max_cm)
               VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (chart_id, size_label, measurement_key) DO UPDATE SET min_cm=EXCLUDED.min_cm, max_cm=EXCLUDED.max_cm`,
              [chartId, s.label, s.sortOrder, key, r.min, r.max],
            );
          }
        }
      }
    }

    for (const p of PRODUCTS) {
      const brand = BRANDS.find((b) => b.slug === p.brand)!;
      const category = CATEGORIES.find((c) => c.slug === p.category)!;
      const chartId = chartIds.get(`${p.brand}:${p.category}`) ?? null;
      // Products without a brand chart still need a size run.
      const sizes = chartFor(brand, p.category).length
        ? chartFor(brand, p.category)
        : ["S", "M", "L", "XL"].map((label, i) => ({ label, sortOrder: i, index: i + 1, points: {} }));

      const { rows } = await q.query<{ id: string }>(
        `INSERT INTO products (brand_id, category_id, size_chart_id, slug, name, description, fit_type, fabric, stretch, audience,
            price_amount, currency, colorway, external_url, is_demo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'menswear',$10,'USD',$11,$12,true)
         ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, size_chart_id=EXCLUDED.size_chart_id
         RETURNING id`,
        [brandIds.get(p.brand), categoryIds.get(p.category), chartId, p.slug, p.name, p.description, p.fit, p.fabric, p.stretch,
          p.price, p.colorway, brand.website],
      );
      const productId = rows[0]!.id;
      const garment = p.garment ? garmentFor(p, sizes, category.group) : {};

      for (const s of sizes) {
        const { rows: v } = await q.query<{ id: string }>(
          `INSERT INTO product_variants (product_id, size_label, sort_order) VALUES ($1,$2,$3)
           ON CONFLICT (product_id, size_label) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id`,
          [productId, s.label, s.sortOrder],
        );
        for (const [key, value] of Object.entries(garment[s.label] ?? {})) {
          await q.query(
            `INSERT INTO product_measurements (variant_id, measurement_key, value_cm, tolerance_cm, source, collected_at)
             VALUES ($1,$2,$3,1.0,$4,$5)
             ON CONFLICT (variant_id, measurement_key) DO UPDATE SET value_cm=EXCLUDED.value_cm`,
            [v[0]!.id, key, value, DEMO_SOURCE, DEMO_COLLECTED_AT],
          );
        }
      }
    }
  });
  log(`seeded ${MEASUREMENT_POINTS.length} measurement points, ${CATEGORIES.length} categories, ${BRANDS.length} brands, ${PRODUCTS.length} demo products`);

  if (opts.adminEmail) {
    const existing = await db.query("SELECT id FROM users WHERE lower(email) = lower($1)", [opts.adminEmail]);
    if (!existing.rows.length) {
      const password = opts.adminPassword || randomToken(12);
      await db.query(
        `INSERT INTO users (email, full_name, password_hash, role, email_verified_at) VALUES ($1, 'FitMatch Admin', $2, 'admin', now())`,
        [opts.adminEmail, await hashPassword(password)],
      );
      log(`created admin ${opts.adminEmail}${opts.adminPassword ? " (password from ADMIN_PASSWORD)" : ` with generated password: ${password}`}`);
    } else {
      await db.query("UPDATE users SET role = 'admin' WHERE lower(email) = lower($1)", [opts.adminEmail]);
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const db = await getDb();
  await migrate(db);
  await seed(db, { adminEmail: process.env.ADMIN_EMAIL, adminPassword: process.env.ADMIN_PASSWORD });
  await db.close();
}
