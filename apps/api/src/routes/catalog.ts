import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/index.js";
import type { EngineResult, Fit } from "../engine/index.js";
import { notFound, parse } from "../lib/http.js";
import { PRODUCT_SELECT, audienceFor, findProduct, mapProduct, type ProductRow } from "../services/catalog.js";
import { loadProfileOrPrimary, type Profile } from "../services/profiles.js";
import {
  BEST_CHART_SQL,
  loadCategories,
  loadCharts,
  loadCommunityFeedback,
  loadGarments,
  loadPersonalFeedback,
  resolveFit,
  runEngine,
} from "../services/recommendations.js";

export const catalogRouter = Router();

catalogRouter.get("/measurement-points", async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query(
    "SELECT key, label, region, description, how_to_measure AS \"howToMeasure\", min_cm AS \"minCm\", max_cm AS \"maxCm\" FROM measurement_points ORDER BY sort_order",
  );
  res.json({ points: rows });
});

catalogRouter.get("/categories", async (_req, res) => {
  const db = await getDb();
  res.json({ categories: await loadCategories(db) });
});

catalogRouter.get("/brands", async (req, res) => {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT b.id, b.slug, b.name, b.country, b.website_url AS "websiteUrl", b.description, b.sizing_notes AS "sizingNotes", b.logo_url AS "logoUrl",
       (SELECT count(*)::int FROM products p WHERE p.brand_id = b.id AND p.is_active) AS "productCount",
       COALESCE((SELECT array_agg(DISTINCT c.slug) FROM brand_size_charts s JOIN clothing_categories c ON c.id = s.category_id
                 WHERE s.brand_id = b.id AND s.verification_status <> 'rejected'), '{}') AS "chartCategories",
       EXISTS (SELECT 1 FROM brand_size_charts s WHERE s.brand_id = b.id AND s.verification_status = 'verified') AS "hasVerifiedData"
     FROM brands b WHERE b.is_active ORDER BY b.name`,
  );
  const history = req.user
    ? (await db.query<{ brand_id: string; last_checked_at: string }>(
        "SELECT brand_id, max(last_checked_at) AS last_checked_at FROM user_brand_history WHERE user_id = $1 GROUP BY brand_id",
        [req.user.id],
      )).rows
    : [];
  res.json({
    brands: rows.map((b) => ({ ...b, lastCheckedAt: history.find((h) => h.brand_id === b.id)?.last_checked_at ?? null })),
  });
});

catalogRouter.get("/brands/:slug", async (req, res) => {
  const db = await getDb();
  const slug = parse(z.string().max(80), req.params.slug);
  const { rows } = await db.query(
    `SELECT id, slug, name, country, website_url AS "websiteUrl", description, sizing_notes AS "sizingNotes", logo_url AS "logoUrl"
     FROM brands WHERE slug = $1 AND is_active`,
    [slug],
  );
  const brand = rows[0];
  if (!brand) throw notFound("Brand");
  const { rows: charts } = await db.query<{ id: string }>(
    `SELECT s.id, c.slug AS category_slug FROM brand_size_charts s JOIN clothing_categories c ON c.id = s.category_id
     WHERE s.brand_id = $1 AND s.verification_status <> 'rejected' ORDER BY c.sort_order`,
    [brand.id],
  );
  const loaded = await loadCharts(db, charts.map((c) => c.id));
  res.json({
    brand,
    charts: charts.map((c) => ({ categorySlug: (c as unknown as { category_slug: string }).category_slug, ...loaded.get(c.id)! })),
  });
});

const listSchema = z.object({
  search: z.string().trim().max(80).optional(),
  brand: z.string().max(400).optional(), // comma separated slugs
  category: z.string().max(400).optional(),
  fit: z.string().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["recommended", "newest", "price_asc", "price_desc", "fit"]).default("recommended"),
  fitsMe: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});
const csv = (s?: string) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : null);

export interface ProductRecommendationSummary {
  status: EngineResult["status"];
  recommendedSize?: string;
  alternativeSize?: string | null;
  matchQuality?: string;
  confidence?: string;
  missing?: string[];
}

/** Compute recommendations for many products at once with bulk-loaded data. */
export async function recommendForProducts(products: ProductRow[], profile: Profile, userId: string, fitOverride?: Fit | null) {
  const db = await getDb();
  const ids = products.map((p) => p.id);
  const [categories, charts, garments, community, personal] = await Promise.all([
    loadCategories(db),
    loadCharts(db, [...new Set(products.map((p) => p.chartId).filter((x): x is string => Boolean(x)))]),
    loadGarments(db, ids),
    loadCommunityFeedback(db, ids),
    loadPersonalFeedback(db, userId),
  ]);
  const out = new Map<string, EngineResult>();
  for (const p of products) {
    const category = categories.find((c) => c.id === p.category.id)!;
    out.set(
      p.id,
      await runEngine({
        profile,
        category,
        fitPreference: resolveFit(profile, category.slug, fitOverride),
        chart: p.chartId ? charts.get(p.chartId) : null,
        garment: garments.get(p.id) ?? null,
        product: { fitType: p.fitType as Fit, stretch: p.stretch as "none" },
        community: community.get(p.id) ?? null,
        personal: personal.get(`${p.brand.id}:${p.category.id}`) ?? null,
      }),
    );
  }
  return out;
}

export function summarize(r: EngineResult): ProductRecommendationSummary {
  if (r.status === "ok") {
    return { status: r.status, recommendedSize: r.recommendedSize, alternativeSize: r.alternativeSize, matchQuality: r.matchQuality, confidence: r.confidence };
  }
  if (r.status === "missing_measurements") return { status: r.status, missing: r.missing };
  return { status: r.status };
}

const qualityRank: Record<string, number> = { excellent: 0, good: 1, fair: 2, poor: 3 };

catalogRouter.get("/products", async (req, res) => {
  const f = parse(listSchema, req.query);
  const db = await getDb();
  const audience = audienceFor(req.user);
  const { rows } = await db.query(
    `${PRODUCT_SELECT("$1")}
     WHERE p.is_active AND b.is_active
       AND ($2::text IS NULL OR p.name ILIKE '%' || $2 || '%' OR b.name ILIKE '%' || $2 || '%' OR c.name ILIKE '%' || $2 || '%')
       AND ($3::text[] IS NULL OR b.slug = ANY($3))
       AND ($4::text[] IS NULL OR c.slug = ANY($4))
       AND ($5::text[] IS NULL OR p.fit_type = ANY($5))
       AND ($6::numeric IS NULL OR p.price_amount >= $6)
       AND ($7::numeric IS NULL OR p.price_amount <= $7)
     ORDER BY p.created_at DESC, p.name
     LIMIT 500`,
    [audience, f.search || null, csv(f.brand), csv(f.category), csv(f.fit), f.minPrice ?? null, f.maxPrice ?? null],
  );
  let products = rows.map(mapProduct);

  let recs = new Map<string, EngineResult>();
  let profile: Profile | null = null;
  if (req.user) {
    profile = await loadProfileOrPrimary(db, req.user.id);
    if (profile) recs = await recommendForProducts(products, profile, req.user.id);
  }
  const rank = (p: ProductRow) => {
    const r = recs.get(p.id);
    return r?.status === "ok" ? qualityRank[r.matchQuality]! : r?.status === "missing_measurements" ? 5 : 4;
  };
  if (f.fitsMe === "true") products = products.filter((p) => rank(p) <= 1);
  if (f.sort === "price_asc") products.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  if (f.sort === "price_desc") products.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  if (f.sort === "fit" || (f.sort === "recommended" && recs.size)) products.sort((a, b) => rank(a) - rank(b));

  const total = products.length;
  const page = products.slice(f.offset, f.offset + f.limit);
  const saved = req.user
    ? new Set((await db.query<{ product_id: string }>("SELECT product_id FROM saved_products WHERE user_id = $1", [req.user.id])).rows.map((r) => r.product_id))
    : new Set<string>();

  const { rows: priceRange } = await db.query<{ min: number; max: number }>(
    "SELECT floor(min(price_amount))::int AS min, ceil(max(price_amount))::int AS max FROM products WHERE is_active",
  );
  res.json({
    total,
    limit: f.limit,
    offset: f.offset,
    priceRange: priceRange[0],
    hasProfile: Boolean(profile),
    products: page.map((p) => ({
      ...p,
      isSaved: saved.has(p.id),
      recommendation: recs.has(p.id) ? summarize(recs.get(p.id)!) : null,
    })),
  });
});

catalogRouter.get("/products/:slug", async (req, res) => {
  const slug = parse(z.string().max(120), req.params.slug);
  const q = parse(z.object({ fit: z.enum(["slim", "regular", "relaxed", "oversized"]).optional(), profileId: z.string().uuid().optional() }), req.query);
  const db = await getDb();
  const product = await findProduct(db, { slug }, audienceFor(req.user));
  if (!product) throw notFound("Product");

  const [charts, garments, feedback] = await Promise.all([
    loadCharts(db, product.chartId ? [product.chartId] : []),
    loadGarments(db, [product.id]),
    db.query(
      `SELECT overall_fit, count(DISTINCT user_id)::int AS n FROM fit_feedback
       WHERE product_id = $1 AND moderation_status = 'active' GROUP BY overall_fit`,
      [product.id],
    ),
  ]);

  let recommendation: EngineResult | null = null;
  let profile: Profile | null = null;
  let isSaved = false;
  let fitPreference: Fit | null = null;
  if (req.user) {
    profile = await loadProfileOrPrimary(db, req.user.id, q.profileId);
    if (profile) {
      fitPreference = resolveFit(profile, product.category.slug, q.fit);
      recommendation = (await recommendForProducts([product], profile, req.user.id, q.fit)).get(product.id) ?? null;
    }
    isSaved = Boolean((await db.query("SELECT 1 FROM saved_products WHERE user_id = $1 AND product_id = $2", [req.user.id, product.id])).rows.length);
  }

  res.json({
    product: { ...product, isSaved },
    chart: product.chartId ? charts.get(product.chartId) ?? null : null,
    garment: garments.get(product.id) ?? null,
    feedbackSummary: Object.fromEntries(feedback.rows.map((r) => [r.overall_fit as string, r.n as number])),
    recommendation,
    fitPreference,
    profile: profile ? { id: profile.id, name: profile.name } : null,
  });
});

/** Brands that have a chart (or products) for a category — used by the size finder. */
catalogRouter.get("/categories/:slug/brands", async (req, res) => {
  const slug = parse(z.string().max(80), req.params.slug);
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT b.id, b.slug, b.name, b.country,
       ${BEST_CHART_SQL("b.id", "c.id", "'menswear'")} AS "chartId",
       (SELECT count(*)::int FROM products p WHERE p.brand_id = b.id AND p.category_id = c.id AND p.is_active) AS "productCount"
     FROM brands b CROSS JOIN clothing_categories c
     WHERE c.slug = $1 AND b.is_active
     ORDER BY b.name`,
    [slug],
  );
  res.json({ brands: rows.filter((r) => r.chartId || (r.productCount as number) > 0) });
});
