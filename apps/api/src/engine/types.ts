/**
 * Recommendation engine contract.
 *
 * Everything here is plain JSON so the same payload can be POSTed to an external
 * service (e.g. a future Python/FastAPI model) without translation.
 * All lengths are centimetres.
 */

export type Fit = "slim" | "regular" | "relaxed" | "oversized";
export type Stretch = "none" | "low" | "medium" | "high";
export type Verification = "unverified" | "pending" | "verified" | "rejected";
export type MeasurementMethod = "self" | "assisted" | "professional" | "estimated";

export const BODY_MEASUREMENT_KEYS = [
  "chest",
  "shoulder",
  "neck",
  "sleeve",
  "bicep",
  "arm_length",
  "waist",
  "hip",
  "thigh",
  "inseam",
  "outseam",
  "calf",
] as const;
export type BodyKey = (typeof BODY_MEASUREMENT_KEYS)[number];
/** Garment-only points (no body equivalent). */
export type GarmentOnlyKey = "body_length";
export type MeasurementKey = BodyKey | GarmentOnlyKey;

export interface CategoryInput {
  slug: string;
  name: string;
  garmentGroup: "top" | "bottom" | "outerwear" | "formal";
  requiredMeasurements: BodyKey[];
  weights: Partial<Record<BodyKey, number>>;
}

export interface ChartSize {
  label: string;
  sortOrder: number;
  points: Partial<Record<MeasurementKey, { min: number; max: number }>>;
}

export interface GarmentSize {
  label: string;
  sortOrder: number;
  points: Partial<Record<MeasurementKey, { value: number; tolerance: number }>>;
}

export interface EngineInput {
  category: CategoryInput;
  body: Partial<Record<BodyKey, number>>;
  heightCm?: number | null;
  measurementMethod: MeasurementMethod;
  fitPreference: Fit;
  product?: { fitType: Fit; stretch: Stretch } | null;
  /** Brand size chart (category-level). basis "body" = body measurement ranges. */
  chart?: {
    basis: "body" | "garment";
    verification: Verification;
    isDemo: boolean;
    sizes: ChartSize[];
  } | null;
  /** Product-level garment measurements. */
  garment?: {
    verification: Verification;
    isDemo: boolean;
    sizes: GarmentSize[];
  } | null;
  /** Aggregated, moderated feedback from distinct users for this product. */
  communityFeedback?: { distinctUsers: number; meanOffset: number } | null;
  /** The current user's own latest feedback for this brand + category. */
  personalFeedback?: { offset: number; purchasedSize: string } | null;
}

export type PointStatus = "within" | "slightly_snug" | "snug" | "slightly_loose" | "loose";

export interface PointResult {
  key: BodyKey;
  weight: number;
  userCm: number;
  /** body chart range for the recommended size */
  referenceMinCm?: number;
  referenceMaxCm?: number;
  /** garment measurement and the garment size we aimed for */
  garmentCm?: number;
  targetCm?: number;
  /** signed difference, positive = room to spare, negative = tighter than intended */
  diffCm: number;
  status: PointStatus;
}

export interface SizeScore {
  size: string;
  score: number;
  quality: MatchQuality;
}

export type MatchQuality = "excellent" | "good" | "fair" | "poor";
export type Confidence = "high" | "moderate" | "low";

export type EngineResult =
  | {
      status: "ok";
      engineVersion: string;
      basis: "garment" | "body_chart";
      recommendedSize: string;
      alternativeSize: string | null;
      alternativeReason: string | null;
      score: number;
      matchQuality: MatchQuality;
      confidence: Confidence;
      confidenceReasons: string[];
      coverage: number;
      dataVerification: Verification;
      isDemoData: boolean;
      measurements: PointResult[];
      sizes: SizeScore[];
      explanation: string;
      warnings: string[];
      adjustments: string[];
    }
  | {
      status: "insufficient_data";
      engineVersion: string;
      message: string;
      detail: string;
    }
  | {
      status: "missing_measurements";
      engineVersion: string;
      message: string;
      missing: BodyKey[];
    };

export interface RecommendationEngine {
  readonly name: string;
  recommend(input: EngineInput): Promise<EngineResult>;
}

export const INSUFFICIENT_MESSAGE = "Insufficient product sizing information for a reliable recommendation.";
