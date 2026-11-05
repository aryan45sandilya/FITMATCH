import type { Queryable } from "../db/index.js";
import {
  feedbackOffset,
  getEngine,
  type BodyKey,
  type CategoryInput,
  type ChartSize,
  type EngineInput,
  type EngineResult,
  type Fit,
  type GarmentSize,
  type Stretch,
  type Verification,
} from "../engine/index.js";
import type { ChartMarket, Market } from "./markets.js";
import type { Profile } from "./profiles.js";

export interface CategoryRow extends CategoryInput {
  id: number;
}

export async function loadCategories(q: Queryable): Promise<CategoryRow[]> {
  const { rows } = await q.query(
    "SELECT id, slug, name, garment_group, required_measurements, measurement_weights FROM clothing_categories ORDER BY sort_order, id",
  );
  return rows.map((r) => ({
    id: r.id as number,
    slug: r.slug as string,
    name: r.name as string,
    garmentGroup: r.garment_group as CategoryRow["garmentGroup"],
    requiredMeasurements: r.required_measurements as BodyKey[],
    weights: (typeof r.measurement_weights === "string" ? JSON.parse(r.measurement_weights as string) : r.measurement_weights) as CategoryRow["weights"],
  }));
}

export interface ChartData {
  id: string;
  name: string;
  basis: "body" | "garment";
  source: string;
  sourceUrl: string | null;
  collectedAt: string;
  verification: Verification;
  isDemo: boolean;
  audience: string;
  market: ChartMarket;
  notes: string | null;
  sizes: ChartSize[];
}

export async function loadCharts(q: Queryable, ids: string[]): Promise<Map<string, ChartData>> {
  const out = new Map<string, ChartData>();
  if (!ids.length) return out;
  const { rows: charts } = await q.query(
    `SELECT id, name, measurement_basis, source, source_url, collected_at, verification_status, is_demo, audience, market, notes
     FROM brand_size_charts WHERE id = ANY($1::uuid[])`,
    [ids],
  );
  for (const c of charts) {
    out.set(c.id as string, {
      id: c.id as string,
      name: c.name as string,
      basis: c.measurement_basis as "body" | "garment",
      source: c.source as string,
      sourceUrl: (c.source_url as string) ?? null,
      collectedAt: toDate(c.collected_at),
      verification: c.verification_status as Verification,
      isDemo: c.is_demo as boolean,
      audience: c.audience as string,
      market: c.market as ChartMarket,
      notes: (c.notes as string) ?? null,
      sizes: [],
    });
  }
  const { rows } = await q.query(
    `SELECT chart_id, size_label, sort_order, measurement_key, min_cm, max_cm
     FROM size_chart_measurements WHERE chart_id = ANY($1::uuid[]) ORDER BY sort_order, measurement_key`,
    [ids],
  );
  for (const r of rows) {
    const chart = out.get(r.chart_id as string)!;
    let size = chart.sizes.find((s) => s.label === r.size_label);
    if (!size) {
      size = { label: r.size_label as string, sortOrder: r.sort_order as number, points: {} };
      chart.sizes.push(size);
    }
    size.points[r.measurement_key as BodyKey] = { min: r.min_cm as number, max: r.max_cm as number };
  }
  return out;
}

export interface GarmentData {
  verification: Verification;
  isDemo: boolean;
  source: string | null;
  collectedAt: string | null;
  sizes: GarmentSize[];
}

export async function loadGarments(q: Queryable, productIds: string[]): Promise<Map<string, GarmentData>> {
  const out = new Map<string, GarmentData>();
  if (!productIds.length) return out;
  const { rows } = await q.query(
    `SELECT v.product_id, v.size_label, v.sort_order, m.measurement_key, m.value_cm, m.tolerance_cm, m.source, m.collected_at,
            m.verification_status, p.is_demo
     FROM product_measurements m
     JOIN product_variants v ON v.id = m.variant_id
     JOIN products p ON p.id = v.product_id
     WHERE v.product_id = ANY($1::uuid[]) AND v.is_offered AND m.verification_status <> 'rejected'
     ORDER BY v.sort_order`,
    [productIds],
  );
  for (const r of rows) {
    const pid = r.product_id as string;
    let g = out.get(pid);
    if (!g) {
      g = { verification: "verified", isDemo: r.is_demo as boolean, source: r.source as string, collectedAt: toDate(r.collected_at), sizes: [] };
      out.set(pid, g);
    }
    // The weakest verification state across all rows applies to the whole set.
    if (r.verification_status !== "verified") g.verification = r.verification_status as Verification;
    let size = g.sizes.find((s) => s.label === r.size_label);
    if (!size) {
      size = { label: r.size_label as string, sortOrder: r.sort_order as number, points: {} };
      g.sizes.push(size);
    }
    size.points[r.measurement_key as BodyKey] = { value: r.value_cm as number, tolerance: r.tolerance_cm as number };
  }
  return out;
}

/** Latest active feedback per distinct user for each product. */
export async function loadCommunityFeedback(q: Queryable, productIds: string[]) {
  const out = new Map<string, { distinctUsers: number; meanOffset: number }>();
  if (!productIds.length) return out;
  const { rows } = await q.query(
    `SELECT product_id, count(*)::int AS users,
       avg(CASE overall_fit WHEN 'too_tight' THEN -2 WHEN 'slightly_tight' THEN -1 WHEN 'just_right' THEN 0
                            WHEN 'slightly_loose' THEN 1 ELSE 2 END)::float8 AS mean
     FROM (SELECT DISTINCT ON (user_id, product_id) product_id, overall_fit
           FROM fit_feedback WHERE product_id = ANY($1::uuid[]) AND moderation_status = 'active'
           ORDER BY user_id, product_id, created_at DESC) latest
     GROUP BY product_id`,
    [productIds],
  );
  for (const r of rows) out.set(r.product_id as string, { distinctUsers: r.users as number, meanOffset: r.mean as number });
  return out;
}

export async function loadPersonalFeedback(q: Queryable, userId: string) {
  const out = new Map<string, { offset: number; purchasedSize: string }>();
  const { rows } = await q.query(
    `SELECT DISTINCT ON (brand_id, category_id) brand_id, category_id, overall_fit, purchased_size
     FROM fit_feedback WHERE user_id = $1 ORDER BY brand_id, category_id, created_at DESC`,
    [userId],
  );
  for (const r of rows) {
    out.set(`${r.brand_id}:${r.category_id}`, { offset: feedbackOffset[r.overall_fit as string] ?? 0, purchasedSize: r.purchased_size as string });
  }
  return out;
}

/**
 * Best chart for a brand + category + market:
 *  1. a real (non-demo) chart for the shopper's market,
 *  2. otherwise any real chart (UK/EU first, as the most widely published international chart),
 *  3. otherwise demonstration data.
 * Within each tier: verified first, then matching audience, then most recent.
 */
export const BEST_CHART_SQL = (brandExpr: string, categoryExpr: string, audienceExpr: string, marketExpr: string) => `(
  SELECT c.id FROM brand_size_charts c
  WHERE c.brand_id = ${brandExpr} AND c.category_id = ${categoryExpr} AND c.verification_status <> 'rejected'
  ORDER BY (c.market = ${marketExpr} AND NOT c.is_demo) DESC, (NOT c.is_demo) DESC, (c.market = 'UK_EU') DESC,
    (c.verification_status = 'verified') DESC, (c.audience = ${audienceExpr}) DESC, c.collected_at DESC
  LIMIT 1)`;

/** "Brand doesn't publish a chart for this market" notes, keyed by brand id. */
export async function loadMarketNotes(q: Queryable, market: Market): Promise<Map<string, string>> {
  const { rows } = await q.query<{ brand_id: string; note: string }>("SELECT brand_id, note FROM brand_market_notes WHERE market = $1", [market]);
  return new Map(rows.map((r) => [r.brand_id, r.note]));
}

export function resolveFit(profile: Profile, categorySlug: string, override?: Fit | null): Fit {
  return override ?? profile.categoryFits[categorySlug] ?? profile.fitPreference;
}

export interface RecommendContext {
  profile: Profile;
  category: CategoryRow;
  fitPreference: Fit;
  chart?: ChartData | null;
  garment?: GarmentData | null;
  product?: { fitType: Fit; stretch: Stretch } | null;
  community?: { distinctUsers: number; meanOffset: number } | null;
  personal?: { offset: number; purchasedSize: string } | null;
  bodyOverride?: Partial<Record<BodyKey, number>>;
  methodOverride?: EngineInput["measurementMethod"];
  /** Shown as a confidence reason, e.g. when another market's chart is used. */
  chartNote?: string | null;
}

export function buildInput(ctx: RecommendContext): EngineInput {
  return {
    category: {
      slug: ctx.category.slug,
      name: ctx.category.name,
      garmentGroup: ctx.category.garmentGroup,
      requiredMeasurements: ctx.category.requiredMeasurements,
      weights: ctx.category.weights,
    },
    body: ctx.bodyOverride ?? ctx.profile.measurements,
    heightCm: ctx.profile.heightCm,
    measurementMethod: ctx.methodOverride ?? ctx.profile.measurementMethod,
    fitPreference: ctx.fitPreference,
    product: ctx.product ?? null,
    chart: ctx.chart ? { basis: ctx.chart.basis, verification: ctx.chart.verification, isDemo: ctx.chart.isDemo, sizes: ctx.chart.sizes, contextNote: ctx.chartNote ?? null } : null,
    garment: ctx.garment ? { verification: ctx.garment.verification, isDemo: ctx.garment.isDemo, sizes: ctx.garment.sizes } : null,
    communityFeedback: ctx.community ?? null,
    personalFeedback: ctx.personal ?? null,
  };
}

export async function runEngine(ctx: RecommendContext): Promise<EngineResult> {
  return getEngine().recommend(buildInput(ctx));
}

export async function persistRecommendation(
  q: Queryable,
  args: { userId: string; profileId: string; brandId: string; categoryId: number; productId?: string | null; fit: Fit; result: EngineResult },
): Promise<string | null> {
  const r = args.result;
  if (r.status === "missing_measurements") return null;
  const ok = r.status === "ok";
  const { rows } = await q.query<{ id: string }>(
    `INSERT INTO size_recommendations (user_id, profile_id, brand_id, category_id, product_id, status, recommended_size, alternative_size,
       match_quality, confidence, score, fit_preference, engine_version, result)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
    [args.userId, args.profileId, args.brandId, args.categoryId, args.productId ?? null, r.status,
      ok ? r.recommendedSize : null, ok ? r.alternativeSize : null, ok ? r.matchQuality : null, ok ? r.confidence : null,
      ok ? r.score : null, args.fit, r.engineVersion, JSON.stringify(r)],
  );
  await q.query(
    `INSERT INTO user_brand_history (user_id, brand_id, category_id, last_recommended_size)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, brand_id, category_id) DO UPDATE SET
       check_count = user_brand_history.check_count + 1,
       last_checked_at = now(),
       last_recommended_size = COALESCE(EXCLUDED.last_recommended_size, user_brand_history.last_recommended_size)`,
    [args.userId, args.brandId, args.categoryId, ok ? r.recommendedSize : null],
  );
  return rows[0]?.id ?? null;
}

function toDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}
