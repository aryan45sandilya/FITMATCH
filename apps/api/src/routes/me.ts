import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { HttpError, notFound, parse } from "../lib/http.js";
import { requireAuth, user } from "../middleware/auth.js";
import { PRODUCT_SELECT, audienceFor, mapProduct } from "../services/catalog.js";
import { marketFor } from "../services/markets.js";
import { loadProfiles } from "../services/profiles.js";
import { recommendForProducts, summarize } from "./catalog.js";

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get("/dashboard", async (req, res) => {
  const db = await getDb();
  const u = user(req);
  const profiles = await loadProfiles(db, u.id);
  const primary = profiles[0] ?? null;

  const [recent, brands, savedRows, feedback] = await Promise.all([
    db.query(
      `SELECT r.id, r.status, r.recommended_size, r.alternative_size, r.match_quality, r.confidence, r.created_at,
              b.name AS brand_name, b.slug AS brand_slug, c.name AS category_name, c.slug AS category_slug, p.name AS product_name, p.slug AS product_slug
       FROM size_recommendations r JOIN brands b ON b.id = r.brand_id JOIN clothing_categories c ON c.id = r.category_id
       LEFT JOIN products p ON p.id = r.product_id
       WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 6`,
      [u.id],
    ),
    db.query(
      `SELECT h.last_recommended_size, h.check_count, h.last_checked_at, b.name AS brand_name, b.slug AS brand_slug, c.name AS category_name, c.slug AS category_slug
       FROM user_brand_history h JOIN brands b ON b.id = h.brand_id JOIN clothing_categories c ON c.id = h.category_id
       WHERE h.user_id = $1 ORDER BY h.last_checked_at DESC LIMIT 8`,
      [u.id],
    ),
    db.query(`${PRODUCT_SELECT("$2", "$3")} JOIN saved_products s ON s.product_id = p.id AND s.user_id = $1 WHERE p.is_active ORDER BY s.created_at DESC LIMIT 4`, [u.id, audienceFor(u), marketFor(req)]),
    db.query(
      `SELECT f.id, f.purchased_size, f.recommended_size, f.overall_fit, f.created_at, b.name AS brand_name, p.name AS product_name
       FROM fit_feedback f JOIN brands b ON b.id = f.brand_id LEFT JOIN products p ON p.id = f.product_id
       WHERE f.user_id = $1 ORDER BY f.created_at DESC LIMIT 4`,
      [u.id],
    ),
  ]);

  const saved = savedRows.rows.map(mapProduct);
  const recs = primary ? await recommendForProducts(saved, primary, u.id, undefined, marketFor(req)) : new Map();

  res.json({
    user: u,
    primaryProfile: primary,
    profileCount: profiles.length,
    recentRecommendations: recent.rows,
    recentBrands: brands.rows,
    savedProducts: saved.map((p) => ({ ...p, recommendation: recs.has(p.id) ? summarize(recs.get(p.id)) : null })),
    recentFeedback: feedback.rows,
  });
});

meRouter.get("/recommendations", async (req, res) => {
  const q = parse(z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }), req.query);
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT r.id, r.status, r.recommended_size, r.alternative_size, r.match_quality, r.confidence, r.fit_preference, r.created_at,
            b.id AS brand_id, b.name AS brand_name, b.slug AS brand_slug, c.name AS category_name, c.slug AS category_slug,
            p.id AS product_id, p.name AS product_name, p.slug AS product_slug, p.colorway, p.image_urls,
            (SELECT array_agg(v.size_label ORDER BY v.sort_order) FROM product_variants v WHERE v.product_id = p.id) AS sizes,
            EXISTS (SELECT 1 FROM fit_feedback f WHERE f.recommendation_id = r.id) AS has_feedback
     FROM size_recommendations r JOIN brands b ON b.id = r.brand_id JOIN clothing_categories c ON c.id = r.category_id
     LEFT JOIN products p ON p.id = r.product_id
     WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT $2`,
    [user(req).id, q.limit],
  );
  res.json({ recommendations: rows });
});

meRouter.get("/saved", async (req, res) => {
  const db = await getDb();
  const u = user(req);
  const { rows } = await db.query(
    `${PRODUCT_SELECT("$2", "$3")} JOIN saved_products s ON s.product_id = p.id AND s.user_id = $1 WHERE p.is_active ORDER BY s.created_at DESC`,
    [u.id, audienceFor(u), marketFor(req)],
  );
  const products = rows.map(mapProduct);
  const [primary] = await loadProfiles(db, u.id);
  const recs = primary ? await recommendForProducts(products, primary, u.id, undefined, marketFor(req)) : new Map();
  res.json({ products: products.map((p) => ({ ...p, isSaved: true, recommendation: recs.has(p.id) ? summarize(recs.get(p.id)) : null })) });
});

meRouter.put("/saved/:productId", async (req, res) => {
  const id = parse(z.string().uuid(), req.params.productId);
  const db = await getDb();
  const { rows } = await db.query("SELECT 1 FROM products WHERE id = $1 AND is_active", [id]);
  if (!rows.length) throw notFound("Product");
  await db.query("INSERT INTO saved_products (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [user(req).id, id]);
  res.json({ saved: true });
});

meRouter.delete("/saved/:productId", async (req, res) => {
  const id = parse(z.string().uuid(), req.params.productId);
  const db = await getDb();
  await db.query("DELETE FROM saved_products WHERE user_id = $1 AND product_id = $2", [user(req).id, id]);
  res.json({ saved: false });
});

// ── Fit feedback ─────────────────────────────────────────────────────────────
const feedbackSchema = z.object({
  productId: z.string().uuid().optional(),
  recommendationId: z.string().uuid().optional(),
  brandSlug: z.string().max(80).optional(),
  categorySlug: z.string().max(80).optional(),
  purchasedSize: z.string().trim().min(1).max(12),
  overallFit: z.enum(["too_tight", "slightly_tight", "just_right", "slightly_loose", "too_loose"]),
  lengthFit: z.enum(["too_short", "right", "too_long"]),
  shoulderFit: z.enum(["tight", "comfortable", "loose", "not_applicable"]),
  wouldBuySameSize: z.boolean(),
  comments: z.string().trim().max(1000).optional(),
});

meRouter.post("/feedback", async (req, res) => {
  const body = parse(feedbackSchema, req.body);
  const db = await getDb();
  const u = user(req);

  let brandId: string | undefined;
  let categoryId: number | undefined;
  let recommendedSize: string | null = null;
  if (body.recommendationId) {
    const { rows } = await db.query<{ brand_id: string; category_id: number; product_id: string | null; recommended_size: string | null }>(
      "SELECT brand_id, category_id, product_id, recommended_size FROM size_recommendations WHERE id = $1 AND user_id = $2",
      [body.recommendationId, u.id],
    );
    if (!rows[0]) throw notFound("Recommendation");
    brandId = rows[0].brand_id;
    categoryId = rows[0].category_id;
    recommendedSize = rows[0].recommended_size;
    body.productId ??= rows[0].product_id ?? undefined;
  }
  if (body.productId) {
    const { rows } = await db.query<{ brand_id: string; category_id: number }>("SELECT brand_id, category_id FROM products WHERE id = $1", [body.productId]);
    if (!rows[0]) throw notFound("Product");
    brandId = rows[0].brand_id;
    categoryId = rows[0].category_id;
    if (!recommendedSize) {
      const { rows: r } = await db.query<{ recommended_size: string | null }>(
        "SELECT recommended_size FROM size_recommendations WHERE user_id = $1 AND product_id = $2 AND status = 'ok' ORDER BY created_at DESC LIMIT 1",
        [u.id, body.productId],
      );
      recommendedSize = r[0]?.recommended_size ?? null;
    }
  }
  if (!brandId && body.brandSlug && body.categorySlug) {
    const { rows } = await db.query<{ brand_id: string; category_id: number }>(
      "SELECT b.id AS brand_id, c.id AS category_id FROM brands b, clothing_categories c WHERE b.slug = $1 AND c.slug = $2",
      [body.brandSlug, body.categorySlug],
    );
    brandId = rows[0]?.brand_id;
    categoryId = rows[0]?.category_id;
  }
  if (!brandId || !categoryId) throw new HttpError(422, "Tell us which product or brand this feedback is for.", "validation_error");

  const { rows } = await db.query(
    `INSERT INTO fit_feedback (user_id, brand_id, category_id, product_id, recommendation_id, recommended_size, purchased_size,
       overall_fit, length_fit, shoulder_fit, would_buy_same_size, comments)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id, created_at`,
    [u.id, brandId, categoryId, body.productId ?? null, body.recommendationId ?? null, recommendedSize, body.purchasedSize,
      body.overallFit, body.lengthFit, body.shoulderFit, body.wouldBuySameSize, body.comments || null],
  );
  res.status(201).json({ feedback: rows[0] });
});

meRouter.get("/feedback", async (req, res) => {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT f.id, f.purchased_size, f.recommended_size, f.overall_fit, f.length_fit, f.shoulder_fit, f.would_buy_same_size, f.comments, f.created_at,
            b.name AS brand_name, c.name AS category_name, p.name AS product_name, p.slug AS product_slug
     FROM fit_feedback f JOIN brands b ON b.id = f.brand_id JOIN clothing_categories c ON c.id = f.category_id
     LEFT JOIN products p ON p.id = f.product_id
     WHERE f.user_id = $1 ORDER BY f.created_at DESC`,
    [user(req).id],
  );
  res.json({ feedback: rows });
});
