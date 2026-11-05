export type Fit = "slim" | "regular" | "relaxed" | "oversized";
export type Unit = "cm" | "in";
export type Market = "IN" | "US" | "UK_EU";
export type ChartMarket = Market | "GLOBAL";
export type BodyKey =
  | "chest" | "shoulder" | "neck" | "sleeve" | "bicep" | "arm_length"
  | "waist" | "hip" | "thigh" | "inseam" | "outseam" | "calf";
export type MeasurementKey = BodyKey | "body_length";
export type Verification = "unverified" | "pending" | "verified" | "rejected";
export type MatchQuality = "excellent" | "good" | "fair" | "poor";
export type Confidence = "high" | "moderate" | "low";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: "user" | "admin";
  preferredUnit: Unit;
  market: Market;
  genderFit: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  googleLinked: boolean;
  createdAt: string;
}

export interface Profile {
  id: string;
  name: string;
  isPrimary: boolean;
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  measurementMethod: "self" | "assisted" | "professional" | "estimated";
  measurements: Partial<Record<BodyKey, number>>;
  fitPreference: Fit;
  categoryFits: Record<string, Fit>;
  completion: { filled: number; total: number; ratio: number };
  updatedAt: string;
}

export interface MeasurementPoint {
  key: MeasurementKey;
  label: string;
  region: "upper" | "lower" | "overall";
  description: string;
  howToMeasure: string;
  minCm: number;
  maxCm: number;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  garmentGroup: "top" | "bottom" | "outerwear" | "formal";
  requiredMeasurements: BodyKey[];
  weights: Partial<Record<BodyKey, number>>;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  websiteUrl: string | null;
  description: string | null;
  sizingNotes: string | null;
  logoUrl: string | null;
  productCount?: number;
  chartCategories?: string[];
  hasVerifiedData?: boolean;
  lastCheckedAt?: string | null;
}

export interface RecommendationSummary {
  status: "ok" | "insufficient_data" | "missing_measurements";
  recommendedSize?: string;
  alternativeSize?: string | null;
  matchQuality?: MatchQuality;
  confidence?: Confidence;
  missing?: BodyKey[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  fitType: Fit;
  fabric: string | null;
  stretch: "none" | "low" | "medium" | "high";
  audience: string;
  price: number | null;
  currency: string;
  imageUrls: string[];
  colorway: string | null;
  externalUrl: string | null;
  /** true when the shop link opens the brand's store for the shopper's market */
  shopLinkIsMarket?: boolean;
  isDemo: boolean;
  brand: { id: string; slug: string; name: string; websiteUrl: string | null };
  category: { id: number; slug: string; name: string };
  chartId: string | null;
  sizes: string[];
  hasGarmentData: boolean;
  isSaved?: boolean;
  recommendation?: RecommendationSummary | null;
}

export type PointStatus = "within" | "slightly_snug" | "snug" | "slightly_loose" | "loose";

export interface PointResult {
  key: BodyKey;
  weight: number;
  userCm: number;
  referenceMinCm?: number;
  referenceMaxCm?: number;
  garmentCm?: number;
  targetCm?: number;
  diffCm: number;
  status: PointStatus;
}

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
      sizes: { size: string; score: number; quality: MatchQuality }[];
      explanation: string;
      warnings: string[];
      adjustments: string[];
    }
  | { status: "insufficient_data"; engineVersion: string; message: string; detail: string }
  | { status: "missing_measurements"; engineVersion: string; message: string; missing: BodyKey[] };

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
  notes?: string | null;
  sizes: { label: string; sortOrder: number; points: Partial<Record<MeasurementKey, { min: number; max: number }>> }[];
}

export interface GarmentData {
  verification: Verification;
  isDemo: boolean;
  source: string | null;
  collectedAt: string | null;
  sizes: { label: string; sortOrder: number; points: Partial<Record<MeasurementKey, { value: number; tolerance: number }>> }[];
}
