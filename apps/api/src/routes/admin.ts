import { createHash } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { cloudinaryEnabled, config } from "../config.js";
import { getDb } from "../db/index.js";
import { MEASUREMENT_KEYS_ALL } from "../engine/keys.js";
import { HttpError, notFound, parse } from "../lib/http.js";
import { requireAdmin, user } from "../middleware/auth.js";
import { loadCategories, loadCharts, loadGarments } from "../services/recommendations.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const slug = z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes.");
const httpsUrl = z.string().trim().url().startsWith("https://", "Use an https:// URL.").max(500);
const verification = z.enum(["unverified", "pending", "verified", "rejected"]);
const fit = z.enum(["slim", "regular", "relaxed", "oversized"]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const measurementKey = z.enum(MEASUREMENT_KEYS_ALL);

// ── Overview & performance ────────────────────────────────────────────────────
adminRouter.get("/overview", async (_req, res) => {
  const db = await getDb();
  const { rows: counts } = await db.query(
    `SELECT
       (SELECT count(*)::int FROM users) AS users,
       (SELECT count(*)::int FROM measurement_profiles) AS profiles,
       (SELECT count(*)::int FROM brands) AS brands,
       (SELECT count(*)::int FROM products) AS products,
       (SELECT count(*)::int FROM brand_size_charts) AS charts,
       (SELECT count(*)::int FROM brand_size_charts WHERE verification_status = 'verified') AS verified_charts,
       (SELECT count(*)::int FROM brand_size_charts WHERE verification_status = 'pending') AS pending_charts,
       (SELECT count(*)::int FROM brand_size_charts WHERE is_demo) AS demo_charts,
       (SELECT count(*)::int FROM size_recommendations) AS recommendations,
       (SELECT count(*)::int FROM size_recommendations WHERE status = 'insufficient_data') AS insufficient,
       (SELECT count(*)::int FROM fit_feedback) AS feedback,
       (SELECT count(*)::int FROM fit_feedback WHERE moderation_status = 'flagged') AS flagged_feedback`,
  );
  // Recommendation performance: of the feedback where we know what we recommended,
  // how often did people buy that size and find it "just right"?
  const { rows: perf } = await db.query(
    `SELECT
       count(*)::int AS rated,
       count(*) FILTER (WHERE purchased_size = recommended_size)::int AS bought_recommended,
       count(*) FILTER (WHERE purchased_size = recommended_size AND overall_fit = 'just_right')::int AS recommended_just_right,
       count(*) FILTER (WHERE purchased_size = recommended_size AND overall_fit IN ('too_tight','slightly_tight'))::int AS recommended_tight,
       count(*) FILTER (WHERE purchased_size = recommended_size AND overall_fit IN ('too_loose','slightly_loose'))::int AS recommended_loose
     FROM fit_feedback WHERE recommended_size IS NOT NULL AND moderation_status = 'active'`,
  );
  const { rows: byBrand } = await db.query(
    `SELECT b.name AS brand, count(*)::int AS n,
       count(*) FILTER (WHERE overall_fit = 'just_right')::int AS just_right,
       count(*) FILTER (WHERE overall_fit IN ('too_tight','slightly_tight'))::int AS tight,
       count(*) FILTER (WHERE overall_fit IN ('too_loose','slightly_loose'))::int AS loose
     FROM fit_feedback f JOIN brands b ON b.id = f.brand_id WHERE f.moderation_status = 'active'
     GROUP BY b.name ORDER BY n DESC LIMIT 12`,
  );
  const { rows: quality } = await db.query(
    `SELECT COALESCE(match_quality, status) AS bucket, count(*)::int AS n FROM size_recommendations GROUP BY 1 ORDER BY 2 DESC`,
  );
  res.json({ counts: counts[0], performance: perf[0], feedbackByBrand: byBrand, qualityDistribution: quality, cloudinaryEnabled });
});

// ── Brands ────────────────────────────────────────────────────────────────────
const brandSchema = z.object({
  slug,
  name: z.string().trim().min(1).max(80),
  country: z.string().trim().max(60).nullable().optional(),
  websiteUrl: httpsUrl.nullable().optional(),
  description: z.string().trim().max(600).nullable().optional(),
  sizingNotes: z.string().trim().max(600).nullable().optional(),
  logoUrl: httpsUrl.nullable().optional(),
  isActive: z.boolean().optional(),
});

adminRouter.get("/brands", async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT b.id, b.slug, b.name, b.country, b.website_url AS "websiteUrl", b.description, b.sizing_notes AS "sizingNotes",
       b.logo_url AS "logoUrl", b.is_active AS "isActive", b.updated_at AS "updatedAt",
       (SELECT count(*)::int FROM products p WHERE p.brand_id = b.id) AS "productCount",
       (SELECT count(*)::int FROM brand_size_charts s WHERE s.brand_id = b.id) AS "chartCount"
     FROM brands b ORDER BY b.name`,
  );
  res.json({ brands: rows });
});

adminRouter.post("/brands", async (req, res) => {
  const b = parse(brandSchema, req.body);
  const db = await getDb();
  const { rows } = await db.query(
    `INSERT INTO brands (slug, name, country, website_url, description, sizing_notes, logo_url, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,true)) RETURNING id`,
    [b.slug, b.name, b.country ?? null, b.websiteUrl ?? null, b.description ?? null, b.sizingNotes ?? null, b.logoUrl ?? null, b.isActive ?? null],
  );
  res.status(201).json({ id: rows[0]!.id });
});

adminRouter.patch("/brands/:id", async (req, res) => {
  const id = parse(z.string().uuid(), req.params.id);
  const b = parse(brandSchema.partial(), req.body);
  const db = await getDb();
  const { rows } = await db.query(
    `UPDATE brands SET slug = COALESCE($2, slug), name = COALESCE($3, name),
       country = CASE WHEN $4::boolean THEN $5 ELSE country END,
       website_url = CASE WHEN $6::boolean THEN $7 ELSE website_url END,
       description = CASE WHEN $8::boolean THEN $9 ELSE description END,
       sizing_notes = CASE WHEN $10::boolean THEN $11 ELSE sizing_notes END,
       logo_url = CASE WHEN $12::boolean THEN $13 ELSE logo_url END,
       is_active = COALESCE($14, is_active), updated_at = now()
     WHERE id = $1 RETURNING id`,
    [id, b.slug ?? null, b.name ?? null, b.country !== undefined, b.country ?? null, b.websiteUrl !== undefined, b.websiteUrl ?? null,
      b.description !== undefined, b.description ?? null, b.sizingNotes !== undefined, b.sizingNotes ?? null,
      b.logoUrl !== undefined, b.logoUrl ?? null, b.isActive ?? null],
  );
  if (!rows[0]) throw notFound("Brand");
  res.json({ ok: true });
});

// ── Categories ────────────────────────────────────────────────────────────────
const categorySchema = z.object({
  slug,
  name: z.string().trim().min(1).max(60),
  garmentGroup: z.enum(["top", "bottom", "outerwear", "formal"]),
  requiredMeasurements: z.array(measurementKey).min(1).max(8),
  weights: z.record(measurementKey, z.number().min(0).max(1)).refine((w) => Object.values(w).some((v) => v > 0), "Give at least one measurement a weight."),
});

adminRouter.post("/categories", async (req, res) => {
  const c = parse(categorySchema, req.body);
  const db = await getDb();
  const { rows } = await db.query(
    `INSERT INTO clothing_categories (slug, name, garment_group, required_measurements, measurement_weights, sort_order)
     VALUES ($1,$2,$3,$4,$5,(SELECT COALESCE(max(sort_order),0)+1 FROM clothing_categories)) RETURNING id`,
    [c.slug, c.name, c.garmentGroup, c.requiredMeasurements, JSON.stringify(c.weights)],
  );
  res.status(201).json({ id: rows[0]!.id });
});

adminRouter.patch("/categories/:id", async (req, res) => {
  const id = parse(z.coerce.number().int().positive(), req.params.id);
  const c = parse(categorySchema.partial(), req.body);
  const db = await getDb();
  const { rows } = await db.query(
    `UPDATE clothing_categories SET name = COALESCE($2, name), garment_group = COALESCE($3, garment_group),
       required_measurements = COALESCE($4, required_measurements), measurement_weights = COALESCE($5::jsonb, measurement_weights),
       updated_at = now() WHERE id = $1 RETURNING id`,
    [id, c.name ?? null, c.garmentGroup ?? null, c.requiredMeasurements ?? null, c.weights ? JSON.stringify(c.weights) : null],
  );
  if (!rows[0]) throw notFound("Category");
  res.json({ ok: true });
});

// ── Products ──────────────────────────────────────────────────────────────────
const productSchema = z.object({
  brandId: z.string().uuid(),
  categoryId: z.number().int().positive(),
  sizeChartId: z.string().uuid().nullable().optional(),
  slug,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  fitType: fit,
  fabric: z.string().trim().max(200).nullable().optional(),
  stretch: z.enum(["none", "low", "medium", "high"]).default("none"),
  audience: z.enum(["menswear", "womenswear", "unisex"]).default("unisex"),
  price: z.number().min(0).max(100000).nullable().optional(),
  currency: z.string().length(3).toUpperCase().default("USD"),
  imageUrls: z.array(httpsUrl).max(8).default([]),
  colorway: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  externalUrl: httpsUrl.nullable().optional(),
  isActive: z.boolean().default(true),
  sizes: z.array(z.string().trim().min(1).max(12)).min(1).max(20).optional(),
});

adminRouter.get("/products", async (req, res) => {
  const q = parse(z.object({ search: z.string().max(80).optional() }), req.query);
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT p.id, p.slug, p.name, p.fit_type AS "fitType", p.is_active AS "isActive", p.is_demo AS "isDemo", p.price_amount AS price, p.currency,
       b.name AS "brandName", c.name AS "categoryName", p.updated_at AS "updatedAt",
       (SELECT count(*)::int FROM product_variants v WHERE v.product_id = p.id) AS "sizeCount",
       (SELECT count(*)::int FROM product_measurements m JOIN product_variants v ON v.id = m.variant_id WHERE v.product_id = p.id) AS "measurementCount",
       (SELECT count(*)::int FROM product_measurements m JOIN product_variants v ON v.id = m.variant_id WHERE v.product_id = p.id AND m.verification_status = 'verified') AS "verifiedCount"
     FROM products p JOIN brands b ON b.id = p.brand_id JOIN clothing_categories c ON c.id = p.category_id
     WHERE $1::text IS NULL OR p.name ILIKE '%' || $1 || '%' OR b.name ILIKE '%' || $1 || '%'
     ORDER BY b.name, p.name`,
    [q.search || null],
  );
  res.json({ products: rows });
});

adminRouter.get("/products/:id", async (req, res) => {
  const id = parse(z.string().uuid(), req.params.id);
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT id, brand_id AS "brandId", category_id AS "categoryId", size_chart_id AS "sizeChartId", slug, name, description,
       fit_type AS "fitType", fabric, stretch, audience, price_amount AS price, currency, image_urls AS "imageUrls", colorway,
       external_url AS "externalUrl", is_active AS "isActive", is_demo AS "isDemo"
     FROM products WHERE id = $1`,
    [id],
  );
  if (!rows[0]) throw notFound("Product");
  const { rows: variants } = await db.query(
    `SELECT v.id, v.size_label AS label, v.sort_order AS "sortOrder", v.is_offered AS "isOffered",
       COALESCE(json_agg(json_build_object('key', m.measurement_key, 'valueCm', m.value_cm, 'toleranceCm', m.tolerance_cm,
         'source', m.source, 'collectedAt', m.collected_at, 'verification', m.verification_status)) FILTER (WHERE m.id IS NOT NULL), '[]') AS measurements
     FROM product_variants v LEFT JOIN product_measurements m ON m.variant_id = v.id
     WHERE v.product_id = $1 GROUP BY v.id ORDER BY v.sort_order`,
    [id],
  );
  res.json({ product: { ...rows[0], currency: String(rows[0].currency).trim() }, variants });
});

adminRouter.post("/products", async (req, res) => {
  const p = parse(productSchema, req.body);
  const db = await getDb();
  const id = await db.tx(async (q) => {
    const { rows } = await q.query<{ id: string }>(
      `INSERT INTO products (brand_id, category_id, size_chart_id, slug, name, description, fit_type, fabric, stretch, audience,
         price_amount, currency, image_urls, colorway, external_url, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [p.brandId, p.categoryId, p.sizeChartId ?? null, p.slug, p.name, p.description ?? null, p.fitType, p.fabric ?? null, p.stretch,
        p.audience, p.price ?? null, p.currency, p.imageUrls, p.colorway ?? null, p.externalUrl ?? null, p.isActive],
    );
    for (const [i, s] of (p.sizes ?? []).entries()) {
      await q.query("INSERT INTO product_variants (product_id, size_label, sort_order) VALUES ($1,$2,$3)", [rows[0]!.id, s, i]);
    }
    return rows[0]!.id;
  });
  res.status(201).json({ id });
});

adminRouter.patch("/products/:id", async (req, res) => {
  const id = parse(z.string().uuid(), req.params.id);
  const p = parse(productSchema.partial().omit({ sizes: true }), req.body);
  const db = await getDb();
  const sets: string[] = [];
  const params: unknown[] = [id];
  const map: Record<string, string> = {
    brandId: "brand_id", categoryId: "category_id", sizeChartId: "size_chart_id", slug: "slug", name: "name", description: "description",
    fitType: "fit_type", fabric: "fabric", stretch: "stretch", audience: "audience", price: "price_amount", currency: "currency",
    imageUrls: "image_urls", colorway: "colorway", externalUrl: "external_url", isActive: "is_active",
  };
  for (const [k, col] of Object.entries(map)) {
    if (k in req.body && (p as Record<string, unknown>)[k] !== undefined) {
      params.push((p as Record<string, unknown>)[k]);
      sets.push(`${col} = $${params.length}`);
    }
  }
  if (!sets.length) throw new HttpError(422, "Nothing to update.", "validation_error");
  const { rows } = await db.query(`UPDATE products SET ${sets.join(", ")}, updated_at = now() WHERE id = $1 RETURNING id`, params);
  if (!rows[0]) throw notFound("Product");
  res.json({ ok: true });
});

/** Replace the size run and garment measurements of a product, with provenance. */
const sizesSchema = z.object({
  source: z.string().trim().min(3).max(300),
  collectedAt: date,
  verification: verification.default("unverified"),
  sizes: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(12),
        isOffered: z.boolean().default(true),
        measurements: z.record(measurementKey, z.number().positive().max(300).nullable()).default({}),
        toleranceCm: z.number().min(0).max(10).default(1),
      }),
    )
    .min(1)
    .max(20),
});

adminRouter.put("/products/:id/sizes", async (req, res) => {
  const id = parse(z.string().uuid(), req.params.id);
  const body = parse(sizesSchema, req.body);
  const labels = body.sizes.map((s) => s.label.toLowerCase());
  if (new Set(labels).size !== labels.length) throw new HttpError(422, "Size labels must be unique.", "validation_error");
  const db = await getDb();
  await db.tx(async (q) => {
    const { rows } = await q.query("SELECT 1 FROM products WHERE id = $1", [id]);
    if (!rows.length) throw notFound("Product");
    await q.query("DELETE FROM product_variants WHERE product_id = $1 AND NOT (size_label = ANY($2::text[]))", [id, body.sizes.map((s) => s.label)]);
    for (const [i, s] of body.sizes.entries()) {
      const { rows: v } = await q.query<{ id: string }>(
        `INSERT INTO product_variants (product_id, size_label, sort_order, is_offered) VALUES ($1,$2,$3,$4)
         ON CONFLICT (product_id, size_label) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_offered = EXCLUDED.is_offered RETURNING id`,
        [id, s.label, i, s.isOffered],
      );
      for (const [key, value] of Object.entries(s.measurements)) {
        if (value == null) {
          await q.query("DELETE FROM product_measurements WHERE variant_id = $1 AND measurement_key = $2", [v[0]!.id, key]);
          continue;
        }
        await q.query(
          `INSERT INTO product_measurements (variant_id, measurement_key, value_cm, tolerance_cm, source, collected_at, verification_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (variant_id, measurement_key) DO UPDATE SET value_cm = EXCLUDED.value_cm, tolerance_cm = EXCLUDED.tolerance_cm,
             source = EXCLUDED.source, collected_at = EXCLUDED.collected_at, verification_status = EXCLUDED.verification_status`,
          [v[0]!.id, key, value, s.toleranceCm, body.source, body.collectedAt, body.verification],
        );
      }
    }
    await q.query("UPDATE products SET updated_at = now(), is_demo = false WHERE id = $1", [id]);
  });
  const garment = (await loadGarments(db, [id])).get(id) ?? null;
  res.json({ ok: true, garment });
});

// ── Size charts ───────────────────────────────────────────────────────────────
adminRouter.get("/charts", async (req, res) => {
  const q = parse(z.object({ brandId: z.string().uuid().optional(), status: verification.optional() }), req.query);
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT s.id, s.name, s.audience, s.measurement_basis AS basis, s.source, s.source_url AS "sourceUrl", s.collected_at AS "collectedAt",
       s.verification_status AS verification, s.verified_at AS "verifiedAt", s.is_demo AS "isDemo", s.updated_at AS "updatedAt",
       b.id AS "brandId", b.name AS "brandName", c.id AS "categoryId", c.name AS "categoryName",
       (SELECT count(DISTINCT size_label)::int FROM size_chart_measurements m WHERE m.chart_id = s.id) AS "sizeCount"
     FROM brand_size_charts s JOIN brands b ON b.id = s.brand_id JOIN clothing_categories c ON c.id = s.category_id
     WHERE ($1::uuid IS NULL OR s.brand_id = $1) AND ($2::text IS NULL OR s.verification_status = $2)
     ORDER BY b.name, c.sort_order`,
    [q.brandId ?? null, q.status ?? null],
  );
  res.json({ charts: rows });
});

adminRouter.get("/charts/:id", async (req, res) => {
  const id = parse(z.string().uuid(), req.params.id);
  const db = await getDb();
  const chart = (await loadCharts(db, [id])).get(id);
  if (!chart) throw notFound("Size chart");
  const { rows } = await db.query(`SELECT brand_id AS "brandId", category_id AS "categoryId", notes FROM brand_size_charts WHERE id = $1`, [id]);
  res.json({ chart: { ...chart, ...rows[0] } });
});

const chartSchema = z.object({
  brandId: z.string().uuid(),
  categoryId: z.number().int().positive(),
  audience: z.enum(["menswear", "womenswear", "unisex"]).default("unisex"),
  name: z.string().trim().min(2).max(120),
  basis: z.enum(["body", "garment"]).default("body"),
  source: z.string().trim().min(3).max(300),
  sourceUrl: httpsUrl.nullable().optional(),
  collectedAt: date,
  notes: z.string().trim().max(1000).nullable().optional(),
  sizes: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(12),
        points: z.record(measurementKey, z.object({ min: z.number().positive().max(300), max: z.number().positive().max(300) }).refine((r) => r.max >= r.min, "Max must be ≥ min.")),
      }),
    )
    .min(1)
    .max(20),
});

async function writeChartSizes(q: import("../db/index.js").Queryable, chartId: string, sizes: z.infer<typeof chartSchema>["sizes"]) {
  await q.query("DELETE FROM size_chart_measurements WHERE chart_id = $1", [chartId]);
  for (const [i, s] of sizes.entries()) {
    for (const [key, r] of Object.entries(s.points)) {
      await q.query(
        "INSERT INTO size_chart_measurements (chart_id, size_label, sort_order, measurement_key, min_cm, max_cm) VALUES ($1,$2,$3,$4,$5,$6)",
        [chartId, s.label, i, key, r.min, r.max],
      );
    }
  }
}

adminRouter.post("/charts", async (req, res) => {
  const c = parse(chartSchema, req.body);
  const db = await getDb();
  const id = await db.tx(async (q) => {
    const { rows } = await q.query<{ id: string }>(
      `INSERT INTO brand_size_charts (brand_id, category_id, audience, name, measurement_basis, source, source_url, collected_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [c.brandId, c.categoryId, c.audience, c.name, c.basis, c.source, c.sourceUrl ?? null, c.collectedAt, c.notes ?? null],
    );
    await writeChartSizes(q, rows[0]!.id, c.sizes);
    return rows[0]!.id;
  });
  res.status(201).json({ id });
});

adminRouter.put("/charts/:id", async (req, res) => {
  const id = parse(z.string().uuid(), req.params.id);
  const c = parse(chartSchema, req.body);
  const db = await getDb();
  await db.tx(async (q) => {
    // Editing data resets verification: changed numbers must be re-verified.
    const { rows } = await q.query(
      `UPDATE brand_size_charts SET brand_id=$2, category_id=$3, audience=$4, name=$5, measurement_basis=$6, source=$7, source_url=$8,
         collected_at=$9, notes=$10, verification_status = 'unverified', verified_by = NULL, verified_at = NULL, is_demo = false, updated_at = now()
       WHERE id = $1 RETURNING id`,
      [id, c.brandId, c.categoryId, c.audience, c.name, c.basis, c.source, c.sourceUrl ?? null, c.collectedAt, c.notes ?? null],
    );
    if (!rows[0]) throw notFound("Size chart");
    await writeChartSizes(q, id, c.sizes);
  });
  res.json({ ok: true });
});

adminRouter.post("/charts/:id/verification", async (req, res) => {
  const id = parse(z.string().uuid(), req.params.id);
  const body = parse(z.object({ status: verification, notes: z.string().trim().max(1000).optional() }), req.body);
  const db = await getDb();
  const { rows: existing } = await db.query<{ is_demo: boolean; source_url: string | null }>("SELECT is_demo, source_url FROM brand_size_charts WHERE id = $1", [id]);
  if (!existing[0]) throw notFound("Size chart");
  if (body.status === "verified" && existing[0].is_demo) {
    throw new HttpError(422, "Demonstration data can't be marked verified. Replace it with sourced measurements first.", "demo_data");
  }
  if (body.status === "verified" && !existing[0].source_url) {
    throw new HttpError(422, "Add a source URL before verifying a chart.", "missing_source");
  }
  await db.query(
    `UPDATE brand_size_charts SET verification_status = $2,
       verified_by = CASE WHEN $2 = 'verified' THEN $3::uuid ELSE NULL END,
       verified_at = CASE WHEN $2 = 'verified' THEN now() ELSE NULL END,
       notes = COALESCE($4, notes), updated_at = now()
     WHERE id = $1`,
    [id, body.status, user(req).id, body.notes ?? null],
  );
  res.json({ ok: true });
});

// ── Feedback review ───────────────────────────────────────────────────────────
adminRouter.get("/feedback", async (req, res) => {
  const q = parse(z.object({ status: z.enum(["active", "flagged", "excluded"]).optional() }), req.query);
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT f.id, f.purchased_size, f.recommended_size, f.overall_fit, f.length_fit, f.shoulder_fit, f.would_buy_same_size, f.comments,
       f.moderation_status, f.created_at, b.name AS brand_name, c.name AS category_name, p.name AS product_name,
       left(u.email, 2) || '…@' || split_part(u.email, '@', 2) AS user_hint
     FROM fit_feedback f JOIN brands b ON b.id = f.brand_id JOIN clothing_categories c ON c.id = f.category_id
     LEFT JOIN products p ON p.id = f.product_id JOIN users u ON u.id = f.user_id
     WHERE $1::text IS NULL OR f.moderation_status = $1
     ORDER BY f.created_at DESC LIMIT 200`,
    [q.status ?? null],
  );
  res.json({ feedback: rows });
});

adminRouter.patch("/feedback/:id", async (req, res) => {
  const id = parse(z.string().uuid(), req.params.id);
  const body = parse(z.object({ moderationStatus: z.enum(["active", "flagged", "excluded"]) }), req.body);
  const db = await getDb();
  const { rows } = await db.query("UPDATE fit_feedback SET moderation_status = $2 WHERE id = $1 RETURNING id", [id, body.moderationStatus]);
  if (!rows[0]) throw notFound("Feedback");
  res.json({ ok: true });
});

adminRouter.get("/categories", async (_req, res) => {
  const db = await getDb();
  res.json({ categories: await loadCategories(db) });
});

// ── Image uploads (Cloudinary signed direct upload) ───────────────────────────
adminRouter.post("/uploads/signature", (_req, res) => {
  if (!cloudinaryEnabled) throw new HttpError(501, "Image uploads need Cloudinary credentials (CLOUDINARY_*). Paste an https image URL instead.", "not_configured");
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "fitmatch/products";
  const toSign = `folder=${folder}&timestamp=${timestamp}${config.cloudinary.apiSecret}`;
  const signature = createHash("sha1").update(toSign).digest("hex");
  res.json({
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`,
    apiKey: config.cloudinary.apiKey,
    timestamp,
    folder,
    signature,
  });
});
