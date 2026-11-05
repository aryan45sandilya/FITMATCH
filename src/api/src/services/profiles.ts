import type { Queryable } from "../db/index.js";
import { notFound } from "../lib/http.js";
import { BODY_MEASUREMENT_KEYS, type BodyKey, type Fit, type MeasurementMethod } from "../engine/types.js";

export interface Profile {
  id: string;
  name: string;
  isPrimary: boolean;
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  measurementMethod: MeasurementMethod;
  measurements: Partial<Record<BodyKey, number>>;
  fitPreference: Fit;
  categoryFits: Record<string, Fit>;
  completion: { filled: number; total: number; ratio: number };
  updatedAt: string;
}

export async function loadProfiles(q: Queryable, userId: string, profileId?: string): Promise<Profile[]> {
  const { rows } = await q.query(
    `SELECT p.*,
       COALESCE((SELECT json_object_agg(b.measurement_key, b.value_cm) FROM body_measurements b WHERE b.profile_id = p.id), '{}'::json) AS measurements,
       (SELECT fit FROM fit_preferences f WHERE f.profile_id = p.id AND f.category_id IS NULL) AS fit_preference,
       COALESCE((SELECT json_object_agg(c.slug, f.fit) FROM fit_preferences f JOIN clothing_categories c ON c.id = f.category_id
                 WHERE f.profile_id = p.id), '{}'::json) AS category_fits
     FROM measurement_profiles p
     WHERE p.user_id = $1 AND ($2::uuid IS NULL OR p.id = $2::uuid)
     ORDER BY p.is_primary DESC, p.created_at ASC`,
    [userId, profileId ?? null],
  );
  return rows.map((r) => {
    const raw = (typeof r.measurements === "string" ? JSON.parse(r.measurements as string) : r.measurements) as Record<string, number | string>;
    const measurements: Partial<Record<BodyKey, number>> = {};
    for (const [k, v] of Object.entries(raw)) measurements[k as BodyKey] = Number(v);
    const fits = (typeof r.category_fits === "string" ? JSON.parse(r.category_fits as string) : r.category_fits) as Record<string, Fit>;
    const filled = BODY_MEASUREMENT_KEYS.filter((k) => measurements[k] !== undefined).length + (r.height_cm ? 1 : 0);
    const total = BODY_MEASUREMENT_KEYS.length + 1;
    return {
      id: r.id as string,
      name: r.name as string,
      isPrimary: r.is_primary as boolean,
      heightCm: (r.height_cm as number) ?? null,
      weightKg: (r.weight_kg as number) ?? null,
      age: (r.age as number) ?? null,
      measurementMethod: r.measurement_method as MeasurementMethod,
      measurements,
      fitPreference: ((r.fit_preference as Fit) ?? "regular"),
      categoryFits: fits ?? {},
      completion: { filled, total, ratio: Math.round((filled / total) * 100) / 100 },
      updatedAt: new Date(r.updated_at as string).toISOString(),
    };
  });
}

export async function loadProfileOrPrimary(q: Queryable, userId: string, profileId?: string | null): Promise<Profile | null> {
  const profiles = await loadProfiles(q, userId, profileId ?? undefined);
  if (profileId && !profiles.length) throw notFound("Measurement profile");
  return profiles[0] ?? null;
}
