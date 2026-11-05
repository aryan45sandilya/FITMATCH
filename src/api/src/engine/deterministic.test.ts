import { describe, expect, it } from "vitest";
import { BRANDS, CATEGORIES, PRODUCTS, chartFor, garmentFor } from "../db/seed-data.js";
import { recommendSync, INSUFFICIENT_MESSAGE, type EngineInput, type BodyKey, type CategoryInput } from "./index.js";

const cat = (slug: string): CategoryInput => {
  const c = CATEGORIES.find((x) => x.slug === slug)!;
  return { slug: c.slug, name: c.name, garmentGroup: c.group, requiredMeasurements: c.required, weights: c.weights };
};
const brand = (slug: string) => BRANDS.find((b) => b.slug === slug)!;
const chart = (brandSlug: string, category: string) => ({
  basis: "body" as const,
  verification: "unverified" as const,
  isDemo: true,
  sizes: chartFor(brand(brandSlug), category).map((s) => ({ label: s.label, sortOrder: s.sortOrder, points: s.points })),
});
const garment = (productSlug: string, override?: Partial<(typeof PRODUCTS)[number]>) => {
  const p = { ...PRODUCTS.find((x) => x.slug === productSlug)!, ...override };
  const sizes = chartFor(brand(p.brand), p.category);
  const g = garmentFor(p, sizes, CATEGORIES.find((c) => c.slug === p.category)!.group);
  return {
    product: { fitType: p.fit, stretch: p.stretch },
    garment: {
      verification: "unverified" as const,
      isDemo: true,
      sizes: sizes.map((s) => ({
        label: s.label,
        sortOrder: s.sortOrder,
        points: Object.fromEntries(Object.entries(g[s.label] ?? {}).map(([k, v]) => [k, { value: v, tolerance: 1 }])),
      })),
    },
  };
};

const mediumMan: Partial<Record<BodyKey, number>> = {
  chest: 100, shoulder: 45, neck: 39.5, sleeve: 85, waist: 85, hip: 100, thigh: 58, inseam: 81, arm_length: 62, bicep: 32,
};

const base = (over: Partial<EngineInput>): EngineInput => ({
  category: cat("t-shirts"),
  body: mediumMan,
  heightCm: 180,
  measurementMethod: "self",
  fitPreference: "regular",
  ...over,
});

describe("deterministic engine — body charts", () => {
  it("recommends M for a 100 cm chest on a standard chart", () => {
    const r = recommendSync(base({ chart: chart("hm", "t-shirts") }));
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.recommendedSize).toBe("M");
    expect(r.basis).toBe("body_chart");
    expect(r.explanation).toMatch(/chest/i);
  });

  it("does not decide on chest alone: a large waist pushes the size up", () => {
    const r = recommendSync(base({ chart: chart("hm", "t-shirts"), body: { ...mediumMan, chest: 103, waist: 100 } }));
    expect(r.status === "ok" && r.recommendedSize).toBe("L");
  });

  it("sizes up in a brand whose chart runs small", () => {
    const hm = recommendSync(base({ chart: chart("hm", "t-shirts"), body: { ...mediumMan, chest: 102 } }));
    const zara = recommendSync(base({ chart: chart("zara", "t-shirts"), body: { ...mediumMan, chest: 102 } }));
    expect(hm.status === "ok" && hm.recommendedSize).toBe("M");
    expect(zara.status === "ok" && zara.recommendedSize).toBe("L");
  });

  it("returns waist sizes for jeans", () => {
    const r = recommendSync(base({ category: cat("jeans"), chart: chart("levis", "jeans"), body: { ...mediumMan, waist: 82, hip: 99 } }));
    expect(r.status === "ok" && r.recommendedSize).toBe("32");
  });

  it("never claims high confidence on unverified demo data", () => {
    const r = recommendSync(base({ chart: chart("hm", "t-shirts") }));
    expect(r.status === "ok" && r.confidence).not.toBe("high");
    expect(r.status === "ok" && r.confidenceReasons.join(" ")).toMatch(/demonstration data/);
  });

  it("allows high confidence for verified garment data with a clear winner", () => {
    const g = garment("uniqlo-supima-crew-tee");
    const r = recommendSync(base({ ...g, garment: { ...g.garment, verification: "verified", isDemo: false } }));
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(["high", "moderate"]).toContain(r.confidence);
  });

  it("does not output percentages anywhere in the result", () => {
    const r = recommendSync(base({ chart: chart("hm", "t-shirts") }));
    expect(JSON.stringify(r)).not.toMatch(/\d+\s?%/);
  });
});

describe("deterministic engine — garment measurements", () => {
  it("prefers garment data over the brand chart", () => {
    const r = recommendSync(base({ chart: chart("hm", "t-shirts"), ...garment("hm-regular-fit-cotton-tee") }));
    expect(r.status === "ok" && r.basis).toBe("garment");
  });

  it("keeps the intended drape of an oversized product instead of sizing down twice", () => {
    const r = recommendSync(base({ ...garment("zara-boxy-heavyweight-tee") }));
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(["M", "L"]).toContain(r.recommendedSize);
    expect(r.warnings.join(" ")).toMatch(/oversized/);
  });

  it("a product that runs small moves the recommendation up", () => {
    const normal = recommendSync(base({ category: cat("shirts"), ...garment("zara-textured-slim-shirt", { bias: 0 }) }));
    const small = recommendSync(base({ category: cat("shirts"), ...garment("zara-textured-slim-shirt", { bias: -6 }) }));
    expect(normal.status === "ok" && small.status === "ok").toBe(true);
    if (normal.status !== "ok" || small.status !== "ok") return;
    const order = ["XS", "S", "M", "L", "XL", "XXL"];
    expect(order.indexOf(small.recommendedSize)).toBeGreaterThan(order.indexOf(normal.recommendedSize));
  });

  it("a relaxed preference recommends the same or a larger size than slim", () => {
    const order = ["XS", "S", "M", "L", "XL", "XXL"];
    const slim = recommendSync(base({ fitPreference: "slim", ...garment("hm-regular-fit-cotton-tee") }));
    const relaxed = recommendSync(base({ fitPreference: "relaxed", ...garment("hm-regular-fit-cotton-tee") }));
    if (slim.status !== "ok" || relaxed.status !== "ok") throw new Error("expected ok");
    expect(order.indexOf(relaxed.recommendedSize)).toBeGreaterThanOrEqual(order.indexOf(slim.recommendedSize));
  });

  it("warns about inseam length on jeans", () => {
    const r = recommendSync(base({ category: cat("jeans"), body: { ...mediumMan, waist: 82, hip: 99, inseam: 74 }, ...garment("levis-original-straight-jeans") }));
    expect(r.status === "ok" && r.warnings.join(" ")).toMatch(/Inseam is .* longer/);
  });

  it("returns per-measurement comparisons and an alternative size", () => {
    const r = recommendSync(base({ ...garment("hm-regular-fit-cotton-tee"), body: { ...mediumMan, chest: 103.5 } }));
    if (r.status !== "ok") throw new Error("expected ok");
    expect(r.measurements.map((m) => m.key)).toEqual(expect.arrayContaining(["chest", "shoulder", "waist"]));
    expect(r.alternativeSize).not.toBeNull();
  });
});

describe("deterministic engine — data sufficiency", () => {
  it("reports insufficient data when nothing is on file", () => {
    const r = recommendSync(base({ category: cat("trousers") }));
    expect(r.status).toBe("insufficient_data");
    if (r.status === "insufficient_data") expect(r.message).toBe(INSUFFICIENT_MESSAGE);
  });

  it("reports insufficient data when the chart covers too few weighted points", () => {
    const thin = { basis: "body" as const, verification: "unverified" as const, isDemo: true, sizes: [{ label: "M", sortOrder: 0, points: { waist: { min: 80, max: 88 } } }] };
    const r = recommendSync(base({ chart: thin }));
    expect(r.status).toBe("insufficient_data");
  });

  it("rejected data is never used", () => {
    const r = recommendSync(base({ chart: { ...chart("hm", "t-shirts"), verification: "rejected" } }));
    expect(r.status).toBe("insufficient_data");
  });

  it("asks for missing required measurements instead of guessing", () => {
    const r = recommendSync(base({ category: cat("shirts"), chart: chart("hm", "shirts"), body: { chest: 100 } }));
    expect(r.status).toBe("missing_measurements");
    if (r.status === "missing_measurements") expect(r.missing).toEqual(["neck"]);
  });
});

describe("deterministic engine — feedback", () => {
  it("ignores community feedback from fewer than five people", () => {
    const a = recommendSync(base({ chart: chart("hm", "t-shirts") }));
    const b = recommendSync(base({ chart: chart("hm", "t-shirts"), communityFeedback: { distinctUsers: 3, meanOffset: -2 } }));
    expect(b).toEqual(a);
  });

  it("applies capped community feedback once enough people agree", () => {
    const r = recommendSync(base({ chart: chart("hm", "t-shirts"), communityFeedback: { distinctUsers: 12, meanOffset: -2 } }));
    if (r.status !== "ok") throw new Error("expected ok");
    expect(r.adjustments[0]).toMatch(/12 shoppers.*runs small.*\+2 cm/);
  });

  it("applies the user's own previous feedback, capped", () => {
    const r = recommendSync(base({ chart: chart("hm", "t-shirts"), personalFeedback: { offset: -2, purchasedSize: "M" } }));
    if (r.status !== "ok") throw new Error("expected ok");
    expect(r.adjustments[0]).toMatch(/\+1\.5 cm/);
  });
});
