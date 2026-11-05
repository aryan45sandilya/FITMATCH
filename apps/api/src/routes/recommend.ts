import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/index.js";
import type { BodyKey, EngineResult, Fit } from "../engine/index.js";
import { HttpError, notFound, parse } from "../lib/http.js";
import { requireAuth, user } from "../middleware/auth.js";
import { audienceFor, findProduct } from "../services/catalog.js";
import { loadProfileOrPrimary } from "../services/profiles.js";
import {
  BEST_CHART_SQL,
  loadCategories,
  loadCharts,
  loadPersonalFeedback,
  persistRecommendation,
  resolveFit,
  runEngine,
} from "../services/recommendations.js";
import { recommendForProducts } from "./catalog.js";

export const recommendRouter = Router();


const fit = z.enum(["slim", "regular", "relaxed", "oversized"]);

const recommendSchema = z
  .object({
    productSlug: z.string().max(120).optional(),
    brandSlug: z.string().max(80).optional(),
    categorySlug: z.string().max(80).optional(),
    profileId: z.string().uuid().optional(),
    fitPreference: fit.optional(),
  })
  .refine((b) => b.productSlug || (b.brandSlug && b.categorySlug), "Choose a product, or a brand and a category.");

/** Size finder: product-level when a product is chosen, otherwise brand + category chart. Persists to history. */
recommendRouter.post("/recommendations", requireAuth, async (req, res) => {
  const body = parse(recommendSchema, req.body);
  const db = await getDb();
  const u = user(req);
  const profile = await loadProfileOrPrimary(db, u.id, body.profileId);
  if (!profile) throw new HttpError(409, "Create a measurement profile first.", "no_profile");

  let result: EngineResult;
  let brandId: string;
  let categoryId: number;
  let productId: string | null = null;
  let fitPref: Fit;
  let context: Record<string, unknown>;

  if (body.productSlug) {
    const product = await findProduct(db, { slug: body.productSlug }, audienceFor(u));
    if (!product) throw notFound("Product");
    fitPref = resolveFit(profile, product.category.slug, body.fitPreference);
    result = (await recommendForProducts([product], profile, u.id, body.fitPreference)).get(product.id)!;
    brandId = product.brand.id;
    categoryId = product.category.id;
    productId = product.id;
    context = { product };
  } else {
    const categories = await loadCategories(db);
    const category = categories.find((c) => c.slug === body.categorySlug);
    if (!category) throw notFound("Category");
    const { rows } = await db.query<{ id: string; name: string; slug: string; chart_id: string | null }>(
      `SELECT b.id, b.name, b.slug, ${BEST_CHART_SQL("b.id", "$2", "$3")} AS chart_id FROM brands b WHERE b.slug = $1 AND b.is_active`,
      [body.brandSlug, category.id, audienceFor(u)],
    );
    const brand = rows[0];
    if (!brand) throw notFound("Brand");
    const charts = await loadCharts(db, brand.chart_id ? [brand.chart_id] : []);
    const personal = await loadPersonalFeedback(db, u.id);
    fitPref = resolveFit(profile, category.slug, body.fitPreference);
    result = await runEngine({
      profile,
      category,
      fitPreference: fitPref,
      chart: brand.chart_id ? charts.get(brand.chart_id) : null,
      personal: personal.get(`${brand.id}:${category.id}`) ?? null,
    });
    brandId = brand.id;
    categoryId = category.id;
    context = { brand: { id: brand.id, slug: brand.slug, name: brand.name }, category: { id: category.id, slug: category.slug, name: category.name } };
  }

  const recommendationId = await persistRecommendation(db, { userId: u.id, profileId: profile.id, brandId, categoryId, productId, fit: fitPref, result });
  res.json({ recommendationId, result, fitPreference: fitPref, profile: { id: profile.id, name: profile.name }, ...context });
});

const compareSchema = z.object({
  categorySlug: z.string().max(80),
  brandSlugs: z.array(z.string().max(80)).max(20).optional(),
  profileId: z.string().uuid().optional(),
  fitPreference: fit.optional(),
  /** "I normally wear size M in Zara" */
  reference: z.object({ brandSlug: z.string().max(80), size: z.string().max(12) }).optional(),
  /** false for previews (e.g. the dashboard) so they do not count as a brand check */
  record: z.boolean().default(true),
});

recommendRouter.post("/compare", requireAuth, async (req, res) => {
  const body = parse(compareSchema, req.body);
  const db = await getDb();
  const u = user(req);
  const categories = await loadCategories(db);
  const category = categories.find((c) => c.slug === body.categorySlug);
  if (!category) throw notFound("Category");

  const profile = await loadProfileOrPrimary(db, u.id, body.profileId);
  if (!profile && !body.reference) throw new HttpError(409, "Create a measurement profile, or tell us a size you already wear.", "no_profile");
  const baseProfile = profile ?? {
    id: "reference", name: "Reference size", isPrimary: false, heightCm: null, weightKg: null, age: null,
    measurementMethod: "estimated" as const, measurements: {}, fitPreference: "regular" as const, categoryFits: {},
    completion: { filled: 0, total: 0, ratio: 0 }, updatedAt: new Date().toISOString(),
  };

  const { rows: brandRows } = await db.query<{ id: string; slug: string; name: string; chart_id: string | null; product_count: number; garment_products: number }>(
    `SELECT b.id, b.slug, b.name, ${BEST_CHART_SQL("b.id", "$1", "$3")} AS chart_id,
       (SELECT count(*)::int FROM products p WHERE p.brand_id = b.id AND p.category_id = $1 AND p.is_active) AS product_count,
       (SELECT count(DISTINCT p.id)::int FROM products p JOIN product_variants v ON v.product_id = p.id JOIN product_measurements m ON m.variant_id = v.id
          WHERE p.brand_id = b.id AND p.category_id = $1 AND p.is_active) AS garment_products
     FROM brands b WHERE b.is_active AND ($2::text[] IS NULL OR b.slug = ANY($2)) ORDER BY b.name`,
    [category.id, body.brandSlugs?.length ? body.brandSlugs : null, audienceFor(u)],
  );
  const charts = await loadCharts(db, brandRows.map((b) => b.chart_id).filter((x): x is string => Boolean(x)));

  // Reference mode: estimate body measurements from the midpoint of the size the user already wears.
  let bodyOverride: Partial<Record<BodyKey, number>> | undefined;
  let referenceNote: string | null = null;
  if (body.reference) {
    const { rows } = await db.query<{ chart_id: string | null; name: string }>(
      `SELECT b.name, ${BEST_CHART_SQL("b.id", "$2", "$3")} AS chart_id FROM brands b WHERE b.slug = $1`,
      [body.reference.brandSlug, category.id, audienceFor(u)],
    );
    const ref = rows[0];
    if (!ref?.chart_id) throw new HttpError(422, "We don't have a size chart for that brand in this category.", "no_reference_chart");
    const refChart = (await loadCharts(db, [ref.chart_id])).get(ref.chart_id)!;
    const size = refChart.sizes.find((s) => s.label.toLowerCase() === body.reference!.size.toLowerCase());
    if (!size) throw new HttpError(422, `Size ${body.reference.size} isn't in ${ref.name}'s chart for ${category.name.toLowerCase()}.`, "unknown_size", { sizes: refChart.sizes.map((s) => s.label) });
    bodyOverride = { ...baseProfile.measurements };
    for (const [k, r] of Object.entries(size.points)) bodyOverride[k as BodyKey] = Math.round(((r.min + r.max) / 2) * 10) / 10;
    referenceNote = `Estimated from the middle of ${ref.name} size ${size.label}. Your exact measurements give a more reliable result.`;
  }

  const fitPref = resolveFit(baseProfile, category.slug, body.fitPreference);
  const personal = profile ? await loadPersonalFeedback(db, u.id) : new Map();
  const rows = [];
  for (const b of brandRows) {
    if (!b.chart_id && b.product_count === 0) continue;
    const chart = b.chart_id ? charts.get(b.chart_id) ?? null : null;
    const result = await runEngine({
      profile: baseProfile,
      category,
      fitPreference: fitPref,
      chart,
      personal: personal.get(`${b.id}:${category.id}`) ?? null,
      bodyOverride,
      methodOverride: body.reference ? "estimated" : undefined,
    });
    rows.push({
      brand: { id: b.id, slug: b.slug, name: b.name },
      chart: chart ? { id: chart.id, name: chart.name, verification: chart.verification, isDemo: chart.isDemo, source: chart.source, collectedAt: chart.collectedAt } : null,
      productCount: b.product_count,
      productsWithGarmentData: b.garment_products,
      result,
    });
  }

  // History is only written for real-profile comparisons.
  if (profile && !body.reference && body.record) {
    for (const r of rows) {
      if (r.result.status !== "ok") continue;
      await db.query(
        `INSERT INTO user_brand_history (user_id, brand_id, category_id, last_recommended_size) VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id, brand_id, category_id) DO UPDATE SET check_count = user_brand_history.check_count + 1,
           last_checked_at = now(), last_recommended_size = EXCLUDED.last_recommended_size`,
        [u.id, r.brand.id, category.id, r.result.recommendedSize],
      );
    }
  }

  res.json({
    category: { id: category.id, slug: category.slug, name: category.name, requiredMeasurements: category.requiredMeasurements },
    fitPreference: fitPref,
    profile: profile ? { id: profile.id, name: profile.name } : null,
    referenceNote,
    rows,
  });
});
