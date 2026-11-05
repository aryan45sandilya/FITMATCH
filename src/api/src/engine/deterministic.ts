import {
  INSUFFICIENT_MESSAGE,
  type BodyKey,
  type Confidence,
  type EngineInput,
  type EngineResult,
  type Fit,
  type MatchQuality,
  type PointResult,
  type PointStatus,
  type RecommendationEngine,
  type SizeScore,
  type Stretch,
  type Verification,
} from "./types.js";

export const ENGINE_VERSION = "deterministic-1.0.0";

/**
 * Tolerance per point: how many cm of deviation counts as "one unit" of mismatch.
 * Small for points with little forgiveness (neck, shoulder), larger for circumferences.
 */
export const TOLERANCE_CM: Record<BodyKey, number> = {
  chest: 4,
  waist: 4,
  hip: 4,
  shoulder: 2,
  neck: 1.5,
  sleeve: 2.5,
  arm_length: 2.5,
  bicep: 2.5,
  thigh: 3,
  inseam: 3,
  outseam: 3,
  calf: 3,
};

/**
 * Wearing ease (garment − body, cm) a garment of each fit type is cut with.
 * Circumferences carry the most ease; lengths carry little.
 */
const EASE_CM: Record<Fit, Partial<Record<BodyKey, number>>> = {
  slim: { chest: 6, waist: 6, hip: 4, shoulder: 0.5, neck: 1.5, sleeve: 1.5, arm_length: 1.5, bicep: 3, thigh: 4, inseam: 0, calf: 3 },
  regular: { chest: 10, waist: 10, hip: 8, shoulder: 1.5, neck: 2, sleeve: 2, arm_length: 2, bicep: 5, thigh: 7, inseam: 0, calf: 5 },
  relaxed: { chest: 16, waist: 14, hip: 12, shoulder: 3, neck: 2.5, sleeve: 2.5, arm_length: 2.5, bicep: 8, thigh: 11, inseam: 0, calf: 8 },
  oversized: { chest: 26, waist: 24, hip: 16, shoulder: 7, neck: 3, sleeve: 3, arm_length: 3, bicep: 12, thigh: 15, inseam: 0, calf: 10 },
};

/** Waistbands sit on the body: very little ease regardless of the cut. */
const WAISTBAND_EASE_CM = 1;

/** How much the user's own preference shifts the target away from the product's intended fit. */
const PREFERENCE_SHIFT: Record<Fit, number> = { slim: -0.5, regular: 0, relaxed: 0.5, oversized: 1 };

/** Stretch lets a garment sit tighter than its nominal measurement without discomfort. */
const STRETCH_TIGHT_FORGIVENESS: Record<Stretch, number> = { none: 1, low: 1.15, medium: 1.35, high: 1.6 };

/** Being too tight is worse than being slightly loose. */
const TIGHT_PENALTY = 1.25;

const MIN_COVERAGE = 0.5;
const COMMUNITY_MIN_USERS = 5;
const COMMUNITY_MAX_SHIFT_CM = 2;
const PERSONAL_MAX_SHIFT_CM = 1.5;

const LABEL: Record<BodyKey, string> = {
  chest: "Chest",
  shoulder: "Shoulders",
  neck: "Neck",
  sleeve: "Sleeve",
  bicep: "Bicep",
  arm_length: "Arm length",
  waist: "Waist",
  hip: "Hips",
  thigh: "Thigh",
  inseam: "Inseam",
  outseam: "Outseam",
  calf: "Calf",
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function qualityFromScore(score: number): MatchQuality {
  if (score <= 0.35) return "excellent";
  if (score <= 0.8) return "good";
  if (score <= 1.4) return "fair";
  return "poor";
}

function statusFrom(diff: number, normalized: number): PointStatus {
  if (normalized <= 0.5) return "within";
  if (diff < 0) return normalized <= 1.25 ? "slightly_snug" : "snug";
  return normalized <= 1.25 ? "slightly_loose" : "loose";
}

interface Evaluated {
  size: string;
  sortOrder: number;
  score: number;
  coverage: number;
  points: PointResult[];
}

/** Garment-based: compare each garment measurement with body + intended ease. */
function evaluateGarment(input: EngineInput, keys: BodyKey[], shiftCm: Partial<Record<BodyKey, number>>): Evaluated[] {
  const fit = input.product?.fitType ?? "regular";
  const stretch = input.product?.stretch ?? "none";
  const prefShift = PREFERENCE_SHIFT[input.fitPreference];
  const totalWeight = sumWeights(input, keys);

  return (input.garment?.sizes ?? []).map((size) => {
    let weighted = 0;
    let usedWeight = 0;
    const points: PointResult[] = [];
    for (const key of keys) {
      const body = input.body[key];
      const g = size.points[key];
      const w = input.category.weights[key] ?? 0;
      if (body === undefined || !g || w <= 0) continue;

      const baseEase = key === "waist" && isBottom(input) ? WAISTBAND_EASE_CM : (EASE_CM[fit][key] ?? 0);
      // Preference moves the target ease toward the next fit band, proportional to its size.
      const nextBand = EASE_CM[prefShift >= 0 ? "relaxed" : "slim"][key] ?? baseEase;
      const prefEase = key === "waist" && isBottom(input) ? 0 : Math.abs(nextBand - (EASE_CM.regular[key] ?? 0)) * prefShift;
      const target = body + baseEase + prefEase + (shiftCm[key] ?? 0);
      const diff = g.value - target;
      const tol = TOLERANCE_CM[key] + g.tolerance * 0.5;
      let normalized = Math.abs(diff) / tol;
      if (diff < 0) normalized *= TIGHT_PENALTY / STRETCH_TIGHT_FORGIVENESS[stretch];

      weighted += w * normalized;
      usedWeight += w;
      points.push({
        key,
        weight: w,
        userCm: body,
        garmentCm: g.value,
        targetCm: round1(target),
        diffCm: round1(diff),
        status: statusFrom(diff, normalized),
      });
    }
    return {
      size: size.label,
      sortOrder: size.sortOrder,
      score: usedWeight ? weighted / usedWeight : Infinity,
      coverage: totalWeight ? usedWeight / totalWeight : 0,
      points,
    };
  });
}

/** Body-chart based: how well does the body sit inside each size's published range. */
function evaluateChart(input: EngineInput, keys: BodyKey[], shiftCm: Partial<Record<BodyKey, number>>): Evaluated[] {
  const prefShift = PREFERENCE_SHIFT[input.fitPreference];
  const productFit = input.product?.fitType;
  const stretch = input.product?.stretch ?? "none";
  const totalWeight = sumWeights(input, keys);
  const isGarmentChart = input.chart?.basis === "garment";
  const fit = productFit ?? "regular";

  return (input.chart?.sizes ?? []).map((size) => {
    let weighted = 0;
    let usedWeight = 0;
    const points: PointResult[] = [];
    for (const key of keys) {
      const rawBody = input.body[key];
      const range = size.points[key];
      const w = input.category.weights[key] ?? 0;
      if (rawBody === undefined || !range || w <= 0) continue;

      // A relaxed preference behaves like a slightly larger body against the chart, and vice versa.
      const prefCm = key === "waist" && isBottom(input) ? 0 : prefShift * TOLERANCE_CM[key];
      let effective = rawBody + prefCm + (shiftCm[key] ?? 0);
      if (isGarmentChart) {
        const ease = key === "waist" && isBottom(input) ? WAISTBAND_EASE_CM : (EASE_CM[fit][key] ?? 0);
        effective += ease;
      }

      const mid = (range.min + range.max) / 2;
      const half = Math.max((range.max - range.min) / 2, 0.5);
      const tol = TOLERANCE_CM[key];
      let normalized: number;
      let diff: number; // positive = room to spare
      if (effective >= range.min && effective <= range.max) {
        normalized = 0.25 * (Math.abs(effective - mid) / half);
        diff = mid - effective;
      } else if (effective > range.max) {
        diff = range.max - effective;
        normalized = (0.25 + Math.abs(diff) / tol) * (TIGHT_PENALTY / STRETCH_TIGHT_FORGIVENESS[stretch]);
      } else {
        diff = range.min - effective;
        normalized = 0.25 + Math.abs(diff) / tol;
      }

      weighted += w * normalized;
      usedWeight += w;
      points.push({
        key,
        weight: w,
        userCm: rawBody,
        referenceMinCm: range.min,
        referenceMaxCm: range.max,
        diffCm: round1(diff),
        status: statusFrom(diff, normalized),
      });
    }
    return {
      size: size.label,
      sortOrder: size.sortOrder,
      score: usedWeight ? weighted / usedWeight : Infinity,
      coverage: totalWeight ? usedWeight / totalWeight : 0,
      points,
    };
  });
}

function isBottom(input: EngineInput) {
  return input.category.garmentGroup === "bottom";
}

function sumWeights(input: EngineInput, keys: BodyKey[]) {
  return keys.reduce((s, k) => s + (input.category.weights[k] ?? 0), 0);
}

function maxCoverage(rows: Evaluated[]) {
  return rows.reduce((m, r) => Math.max(m, r.coverage), 0);
}

export class DeterministicEngine implements RecommendationEngine {
  readonly name = "deterministic";

  async recommend(input: EngineInput): Promise<EngineResult> {
    return recommendSync(input);
  }
}

export function recommendSync(input: EngineInput): EngineResult {
  const missing = input.category.requiredMeasurements.filter((k) => input.body[k] === undefined);
  if (missing.length) {
    return {
      status: "missing_measurements",
      engineVersion: ENGINE_VERSION,
      message: `Add your ${missing.map((k) => LABEL[k].toLowerCase()).join(", ")} measurement${missing.length > 1 ? "s" : ""} to get a ${input.category.name.toLowerCase()} recommendation.`,
      missing,
    };
  }

  const keys = (Object.keys(input.category.weights) as BodyKey[]).filter((k) => (input.category.weights[k] ?? 0) > 0);
  const adjustments: string[] = [];
  const shift: Partial<Record<BodyKey, number>> = {};
  const primary = primaryKey(input);

  // Community feedback: only when enough distinct people agree, and capped, so no single
  // user (or small group) can redefine a brand's sizing.
  const cf = input.communityFeedback;
  if (cf && cf.distinctUsers >= COMMUNITY_MIN_USERS && Math.abs(cf.meanOffset) >= 0.35) {
    const cm = clamp(-cf.meanOffset * 1.5, -COMMUNITY_MAX_SHIFT_CM, COMMUNITY_MAX_SHIFT_CM);
    shift[primary] = (shift[primary] ?? 0) + cm;
    adjustments.push(
      `${cf.distinctUsers} shoppers reported this product runs ${cf.meanOffset < 0 ? "small" : "large"}; the ${LABEL[primary].toLowerCase()} target was adjusted by ${cm > 0 ? "+" : ""}${round1(cm)} cm.`,
    );
  }

  const pf = input.personalFeedback;
  if (pf && pf.offset !== 0) {
    const cm = clamp(-pf.offset * 0.75, -PERSONAL_MAX_SHIFT_CM, PERSONAL_MAX_SHIFT_CM);
    shift[primary] = (shift[primary] ?? 0) + cm;
    adjustments.push(
      `You told us size ${pf.purchasedSize} from this brand felt ${pf.offset < 0 ? "tight" : "loose"}; we nudged the ${LABEL[primary].toLowerCase()} target by ${cm > 0 ? "+" : ""}${round1(cm)} cm.`,
    );
  }

  // Prefer product garment measurements; fall back to the brand's category chart.
  let basis: "garment" | "body_chart" | null = null;
  let rows: Evaluated[] = [];
  let verification: Verification = "unverified";
  let isDemo = false;

  if (input.garment?.sizes.length) {
    const g = evaluateGarment(input, keys, shift);
    if (maxCoverage(g) >= MIN_COVERAGE) {
      basis = "garment";
      rows = g;
      verification = input.garment.verification;
      isDemo = input.garment.isDemo;
    }
  }
  if (!basis && input.chart?.sizes.length) {
    const c = evaluateChart(input, keys, shift);
    if (maxCoverage(c) >= MIN_COVERAGE) {
      basis = "body_chart";
      rows = c;
      verification = input.chart.verification;
      isDemo = input.chart.isDemo;
    }
  }
  if (!basis || verification === "rejected") {
    return {
      status: "insufficient_data",
      engineVersion: ENGINE_VERSION,
      message: INSUFFICIENT_MESSAGE,
      detail: !input.garment?.sizes.length && !input.chart?.sizes.length
        ? "No size chart or garment measurements are on file for this item."
        : verification === "rejected"
          ? "The sizing data on file was rejected during review."
          : `The sizing data on file covers too few of the measurements that matter for ${input.category.name.toLowerCase()}.`,
    };
  }

  const ranked = [...rows].filter((r) => Number.isFinite(r.score)).sort((a, b) => a.score - b.score || a.sortOrder - b.sortOrder);
  const best = ranked[0]!;
  const second = ranked[1];
  const gap = second ? second.score - best.score : Infinity;
  const quality = qualityFromScore(best.score);
  const coverage = best.coverage;

  // Alternative: second-best when it's close, explained in terms of direction.
  let alternativeSize: string | null = null;
  let alternativeReason: string | null = null;
  if (second && (gap < 0.5 || quality !== "excellent")) {
    alternativeSize = second.size;
    const larger = second.sortOrder > best.sortOrder;
    alternativeReason = larger
      ? `Choose ${second.size} if you prefer more room${input.product?.stretch === "none" ? " — this fabric has no stretch" : ""}.`
      : `Choose ${second.size} for a closer, more fitted look.`;
  }

  // Confidence: qualitative, built from explicit factors. Never a fabricated percentage.
  const reasons: string[] = [];
  let level = 2; // 2 high, 1 moderate, 0 low
  const down = (to: number, reason: string) => {
    reasons.push(reason);
    level = Math.min(level, to);
  };
  if (basis === "garment") reasons.push("Based on this product's own garment measurements.");
  else down(1, "Based on the brand's general size chart, not this product's garment measurements.");
  if (basis === "body_chart" && input.chart?.contextNote) down(1, input.chart.contextNote);
  if (verification !== "verified") down(1, isDemo ? "Sizing data is demonstration data and has not been verified." : "Sizing data has not been verified yet.");
  if (coverage < 0.7) down(0, "Only part of the relevant measurements could be compared.");
  else if (coverage < 0.9) down(1, "Some relevant measurements were not available to compare.");
  if (gap < 0.15) down(0, `You sit between ${best.size} and ${second?.size}.`);
  else if (gap < 0.3) down(1, `${second?.size} is also a close match.`);
  if (quality === "fair") down(1, "Even the best size is a fair, not close, match.");
  if (quality === "poor") down(0, "No size in this range matches your measurements closely.");
  if (input.measurementMethod === "estimated") down(0, "Your measurements are estimates.");
  if (level === 2 && reasons.length === 1) reasons.push("Your measurements clearly favour one size.");
  const confidence: Confidence = level === 2 ? "high" : level === 1 ? "moderate" : "low";

  const warnings = buildWarnings(input, best, basis);
  const measurements = best.points.sort((a, b) => b.weight - a.weight);

  return {
    status: "ok",
    engineVersion: ENGINE_VERSION,
    basis,
    recommendedSize: best.size,
    alternativeSize,
    alternativeReason,
    score: round3(best.score),
    matchQuality: quality,
    confidence,
    confidenceReasons: reasons,
    coverage: round3(coverage),
    dataVerification: verification,
    isDemoData: isDemo,
    measurements,
    sizes: [...rows]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map<SizeScore>((r) => ({ size: r.size, score: round3(r.score), quality: qualityFromScore(r.score) })),
    explanation: explain(input, best, basis),
    warnings,
    adjustments,
  };
}

function primaryKey(input: EngineInput): BodyKey {
  const entries = Object.entries(input.category.weights) as [BodyKey, number][];
  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "chest";
}

function explain(input: EngineInput, best: Evaluated, basis: "garment" | "body_chart"): string {
  const sorted = [...best.points].sort((a, b) => b.weight - a.weight);
  const lead = sorted[0];
  if (!lead) return "";
  const within = sorted.filter((p) => p.status === "within").map((p) => LABEL[p.key].toLowerCase());
  const leadText =
    basis === "body_chart"
      ? `Your ${LABEL[lead.key].toLowerCase()} measurement (${round1(lead.userCm)} cm) is closest to this brand's ${best.size} range (${lead.referenceMinCm}–${lead.referenceMaxCm} cm).`
      : `In ${best.size}, this garment measures ${lead.garmentCm} cm at the ${LABEL[lead.key].toLowerCase()} — ${Math.abs(lead.diffCm) <= 1 ? "right on" : `${Math.abs(lead.diffCm)} cm ${lead.diffCm > 0 ? "more than" : "less than"}`} the ${input.product?.fitType ?? "regular"}-fit target for your body.`;
  const rest =
    within.length > 1
      ? ` ${capitalize(listJoin(within))} all sit within range.`
      : sorted.length > 1
        ? ` ${best.size} gives the best balance across the ${sorted.length} measurements compared.`
        : "";
  return leadText + rest;
}

function buildWarnings(input: EngineInput, best: Evaluated, basis: "garment" | "body_chart"): string[] {
  const out: string[] = [];
  for (const p of best.points) {
    if (p.status === "snug") out.push(`${LABEL[p.key]} may feel tight in ${best.size} (${Math.abs(p.diffCm)} cm under the intended fit).`);
    else if (p.status === "loose" && p.key !== "inseam") out.push(`${LABEL[p.key]} may feel loose in ${best.size} (${p.diffCm} cm of extra room).`);
  }

  // Length checks for garment data.
  if (basis === "garment") {
    const size = input.garment?.sizes.find((s) => s.label === best.size);
    const inseam = size?.points.inseam?.value;
    if (inseam !== undefined && input.body.inseam !== undefined) {
      const d = inseam - input.body.inseam;
      if (d > 3) out.push(`Inseam is ${round1(d)} cm longer than yours — expect stacking at the ankle or plan to hem.`);
      if (d < -3) out.push(`Inseam is ${round1(-d)} cm shorter than yours — these may sit above the ankle.`);
    }
    const length = size?.points.body_length?.value;
    if (length !== undefined && input.heightCm && input.category.garmentGroup !== "bottom") {
      const ideal = input.heightCm * (input.product?.fitType === "oversized" ? 0.41 : 0.4);
      if (length - ideal > 5) out.push(`Body length (${length} cm) may run long for your height.`);
      if (ideal - length > 5) out.push(`Body length (${length} cm) may run short for your height.`);
    }
  }

  if (input.product?.fitType === "slim" && input.product.stretch === "none") {
    out.push("Slim cut with no stretch — if you are between sizes, size up.");
  }
  if (input.product?.fitType === "oversized" && input.fitPreference !== "oversized") {
    out.push("This product is designed to be oversized; the recommendation keeps its intended drape.");
  }
  return out;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export const feedbackOffset: Record<string, number> = {
  too_tight: -2,
  slightly_tight: -1,
  just_right: 0,
  slightly_loose: 1,
  too_loose: 2,
};
