import type { Queryable } from "../db/index.js";
import type { SessionUser } from "../middleware/auth.js";
import { BEST_CHART_SQL } from "./recommendations.js";

export function audienceFor(user?: SessionUser | null): string {
  return user?.genderFit === "womenswear" ? "womenswear" : user?.genderFit === "menswear" ? "menswear" : "menswear";
}

export const PRODUCT_SELECT = (audienceParam: string, marketParam: string) => `
  SELECT p.id, p.slug, p.name, p.description, p.fit_type, p.fabric, p.stretch, p.audience, p.price_amount, p.currency,
         p.image_urls, p.colorway, p.external_url, p.is_demo, p.is_active, p.created_at,
         b.id AS brand_id, b.slug AS brand_slug, b.name AS brand_name, b.website_url AS brand_website,
         c.id AS category_id, c.slug AS category_slug, c.name AS category_name,
         COALESCE(p.size_chart_id, ${BEST_CHART_SQL("p.brand_id", "p.category_id", audienceParam, marketParam)}) AS chart_id,
         COALESCE((SELECT array_agg(v.size_label ORDER BY v.sort_order) FROM product_variants v WHERE v.product_id = p.id AND v.is_offered), '{}') AS sizes,
         EXISTS (SELECT 1 FROM product_measurements m JOIN product_variants v ON v.id = m.variant_id WHERE v.product_id = p.id) AS has_garment_data
  FROM products p
  JOIN brands b ON b.id = p.brand_id
  JOIN clothing_categories c ON c.id = p.category_id`;

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  fitType: string;
  fabric: string | null;
  stretch: string;
  audience: string;
  price: number | null;
  currency: string;
  imageUrls: string[];
  colorway: string | null;
  externalUrl: string | null;
  isDemo: boolean;
  isActive: boolean;
  createdAt: string;
  brand: { id: string; slug: string; name: string; websiteUrl: string | null };
  category: { id: number; slug: string; name: string };
  chartId: string | null;
  sizes: string[];
  hasGarmentData: boolean;
}

export function mapProduct(r: Record<string, unknown>): ProductRow {
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    fitType: r.fit_type as string,
    fabric: (r.fabric as string) ?? null,
    stretch: r.stretch as string,
    audience: r.audience as string,
    price: (r.price_amount as number) ?? null,
    currency: (r.currency as string).trim(),
    imageUrls: (r.image_urls as string[]) ?? [],
    colorway: (r.colorway as string) ?? null,
    externalUrl: (r.external_url as string) ?? null,
    isDemo: r.is_demo as boolean,
    isActive: r.is_active as boolean,
    createdAt: new Date(r.created_at as string).toISOString(),
    brand: { id: r.brand_id as string, slug: r.brand_slug as string, name: r.brand_name as string, websiteUrl: (r.brand_website as string) ?? null },
    category: { id: r.category_id as number, slug: r.category_slug as string, name: r.category_name as string },
    chartId: (r.chart_id as string) ?? null,
    sizes: (r.sizes as string[]) ?? [],
    hasGarmentData: Boolean(r.has_garment_data),
  };
}

export async function findProduct(q: Queryable, by: { id?: string; slug?: string }, audience: string, market: string): Promise<ProductRow | null> {
  const { rows } = await q.query(
    `${PRODUCT_SELECT("$3", "$4")} WHERE ($1::uuid IS NULL OR p.id = $1::uuid) AND ($2::text IS NULL OR p.slug = $2) AND p.is_active LIMIT 1`,
    [by.id ?? null, by.slug ?? null, audience, market],
  );
  return rows[0] ? mapProduct(rows[0]) : null;
}
