import { Router } from "express";
import { z } from "zod";
import { getDb, type Queryable } from "../db/index.js";
import { BODY_MEASUREMENT_KEYS } from "../engine/types.js";
import { HttpError, notFound, parse } from "../lib/http.js";
import { requireAuth, user } from "../middleware/auth.js";
import { loadProfiles } from "../services/profiles.js";

export const profilesRouter = Router();
profilesRouter.use(requireAuth);

const fit = z.enum(["slim", "regular", "relaxed", "oversized"]);
const cm = z.number().finite().positive().max(300);

const profileSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  heightCm: z.number().min(100, "Height must be at least 100 cm.").max(250, "Height must be under 250 cm.").nullable().optional(),
  weightKg: z.number().min(25).max(300).nullable().optional(),
  age: z.number().int().min(13).max(120).nullable().optional(),
  measurementMethod: z.enum(["self", "assisted", "professional", "estimated"]).optional(),
  measurements: z.record(z.enum(BODY_MEASUREMENT_KEYS), cm.nullable()).optional(),
  fitPreference: fit.optional(),
  categoryFits: z.record(z.string(), fit.nullable()).optional(),
  makePrimary: z.boolean().optional(),
});
type ProfileBody = z.infer<typeof profileSchema>;

/** Validates against the measurement_points table's plausible ranges. */
async function validateRanges(q: Queryable, m: ProfileBody["measurements"]) {
  if (!m) return;
  const { rows } = await q.query<{ key: string; label: string; min_cm: number; max_cm: number }>("SELECT key, label, min_cm, max_cm FROM measurement_points");
  const errors: Record<string, string> = {};
  for (const [key, value] of Object.entries(m)) {
    if (value == null) continue;
    const p = rows.find((r) => r.key === key);
    if (p && (value < p.min_cm || value > p.max_cm)) {
      errors[`measurements.${key}`] = `${p.label} should be between ${p.min_cm} and ${p.max_cm} cm.`;
    }
  }
  if (Object.keys(errors).length) throw new HttpError(422, "Some measurements look out of range.", "validation_error", errors);
}

async function writeProfile(q: Queryable, profileId: string, body: ProfileBody) {
  if (body.measurements) {
    for (const [key, value] of Object.entries(body.measurements)) {
      if (value == null) {
        await q.query("DELETE FROM body_measurements WHERE profile_id = $1 AND measurement_key = $2", [profileId, key]);
      } else {
        await q.query(
          `INSERT INTO body_measurements (profile_id, measurement_key, value_cm) VALUES ($1, $2, round($3::numeric, 1))
           ON CONFLICT (profile_id, measurement_key) DO UPDATE SET value_cm = EXCLUDED.value_cm, updated_at = now()`,
          [profileId, key, value],
        );
      }
    }
  }
  if (body.fitPreference) {
    await q.query(
      `INSERT INTO fit_preferences (profile_id, category_id, fit) VALUES ($1, NULL, $2)
       ON CONFLICT (profile_id, category_id) DO UPDATE SET fit = EXCLUDED.fit, updated_at = now()`,
      [profileId, body.fitPreference],
    );
  }
  if (body.categoryFits) {
    for (const [slug, f] of Object.entries(body.categoryFits)) {
      const { rows } = await q.query<{ id: number }>("SELECT id FROM clothing_categories WHERE slug = $1", [slug]);
      if (!rows[0]) throw new HttpError(422, `Unknown category "${slug}".`, "validation_error");
      if (f === null) await q.query("DELETE FROM fit_preferences WHERE profile_id = $1 AND category_id = $2", [profileId, rows[0].id]);
      else
        await q.query(
          `INSERT INTO fit_preferences (profile_id, category_id, fit) VALUES ($1, $2, $3)
           ON CONFLICT (profile_id, category_id) DO UPDATE SET fit = EXCLUDED.fit, updated_at = now()`,
          [profileId, rows[0].id, f],
        );
    }
  }
}

profilesRouter.get("/", async (req, res) => {
  const db = await getDb();
  res.json({ profiles: await loadProfiles(db, user(req).id) });
});

profilesRouter.get("/:id", async (req, res) => {
  const db = await getDb();
  const id = parse(z.string().uuid(), req.params.id);
  const [profile] = await loadProfiles(db, user(req).id, id);
  if (!profile) throw notFound("Measurement profile");
  res.json({ profile });
});

profilesRouter.post("/", async (req, res) => {
  const body = parse(profileSchema, req.body);
  const db = await getDb();
  const uid = user(req).id;
  await validateRanges(db, body.measurements);
  const id = await db.tx(async (q) => {
    const { rows: count } = await q.query<{ n: number }>("SELECT count(*)::int AS n FROM measurement_profiles WHERE user_id = $1", [uid]);
    if ((count[0]?.n ?? 0) >= 5) throw new HttpError(422, "You can keep up to 5 measurement profiles.", "limit_reached");
    const primary = body.makePrimary || count[0]?.n === 0;
    if (primary) await q.query("UPDATE measurement_profiles SET is_primary = false WHERE user_id = $1", [uid]);
    const { rows } = await q.query<{ id: string }>(
      `INSERT INTO measurement_profiles (user_id, name, is_primary, height_cm, weight_kg, age, measurement_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [uid, body.name ?? "My profile", primary, body.heightCm ?? null, body.weightKg ?? null, body.age ?? null, body.measurementMethod ?? "self"],
    );
    await writeProfile(q, rows[0]!.id, { ...body, fitPreference: body.fitPreference ?? "regular" });
    return rows[0]!.id;
  });
  const [profile] = await loadProfiles(db, uid, id);
  res.status(201).json({ profile });
});

profilesRouter.put("/:id", async (req, res) => {
  const id = parse(z.string().uuid(), req.params.id);
  const body = parse(profileSchema, req.body);
  const db = await getDb();
  const uid = user(req).id;
  await validateRanges(db, body.measurements);
  await db.tx(async (q) => {
    const { rows } = await q.query("SELECT 1 FROM measurement_profiles WHERE id = $1 AND user_id = $2", [id, uid]);
    if (!rows.length) throw notFound("Measurement profile");
    if (body.makePrimary) await q.query("UPDATE measurement_profiles SET is_primary = false WHERE user_id = $1", [uid]);
    await q.query(
      `UPDATE measurement_profiles SET
         name = COALESCE($3, name),
         height_cm = CASE WHEN $4::boolean THEN $5 ELSE height_cm END,
         weight_kg = CASE WHEN $6::boolean THEN $7 ELSE weight_kg END,
         age = CASE WHEN $8::boolean THEN $9 ELSE age END,
         measurement_method = COALESCE($10, measurement_method),
         is_primary = is_primary OR $11,
         updated_at = now()
       WHERE id = $1 AND user_id = $2`,
      [id, uid, body.name ?? null, body.heightCm !== undefined, body.heightCm ?? null, body.weightKg !== undefined, body.weightKg ?? null,
        body.age !== undefined, body.age ?? null, body.measurementMethod ?? null, body.makePrimary ?? false],
    );
    await writeProfile(q, id, body);
  });
  const [profile] = await loadProfiles(db, uid, id);
  res.json({ profile });
});

profilesRouter.delete("/:id", async (req, res) => {
  const id = parse(z.string().uuid(), req.params.id);
  const db = await getDb();
  const uid = user(req).id;
  await db.tx(async (q) => {
    const { rows } = await q.query<{ is_primary: boolean }>("DELETE FROM measurement_profiles WHERE id = $1 AND user_id = $2 RETURNING is_primary", [id, uid]);
    if (!rows[0]) throw notFound("Measurement profile");
    if (rows[0].is_primary) {
      await q.query(
        `UPDATE measurement_profiles SET is_primary = true WHERE id = (SELECT id FROM measurement_profiles WHERE user_id = $1 ORDER BY created_at LIMIT 1)`,
        [uid],
      );
    }
  });
  res.json({ ok: true });
});
