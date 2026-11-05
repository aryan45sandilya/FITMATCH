import type { BodyKey, Confidence, Fit, MatchQuality, MeasurementKey, PointStatus, Verification } from "./types";

export const MEASUREMENT_LABEL: Record<MeasurementKey, string> = {
  chest: "Chest",
  shoulder: "Shoulder width",
  neck: "Neck",
  sleeve: "Sleeve length",
  bicep: "Bicep",
  arm_length: "Arm length",
  waist: "Waist",
  hip: "Hips",
  thigh: "Thigh",
  inseam: "Inseam",
  outseam: "Outseam",
  calf: "Calf",
  body_length: "Body length",
};

export const UPPER_KEYS: BodyKey[] = ["chest", "shoulder", "neck", "sleeve", "bicep", "arm_length"];
export const LOWER_KEYS: BodyKey[] = ["waist", "hip", "thigh", "inseam", "outseam", "calf"];
export const ALL_BODY_KEYS: BodyKey[] = [...UPPER_KEYS, ...LOWER_KEYS];

export const FIT_OPTIONS: { value: Fit; label: string; description: string }[] = [
  { value: "slim", label: "Slim", description: "Close to the body, minimal ease." },
  { value: "regular", label: "Regular", description: "Classic room through chest and waist." },
  { value: "relaxed", label: "Relaxed", description: "Easy, comfortable, a little extra room." },
  { value: "oversized", label: "Oversized", description: "Generous, dropped and drapey." },
];

export const QUALITY: Record<MatchQuality, { label: string; tone: "success" | "accent" | "warning" | "danger"; level: number }> = {
  excellent: { label: "Excellent match", tone: "success", level: 4 },
  good: { label: "Good match", tone: "success", level: 3 },
  fair: { label: "Fair match", tone: "warning", level: 2 },
  poor: { label: "Poor match", tone: "danger", level: 1 },
};

export const CONFIDENCE: Record<Confidence, { label: string; level: number }> = {
  high: { label: "High confidence", level: 3 },
  moderate: { label: "Moderate confidence", level: 2 },
  low: { label: "Low confidence", level: 1 },
};

export const POINT_STATUS: Record<PointStatus, { label: string; tone: "success" | "warning" | "danger" | "muted" }> = {
  within: { label: "Within range", tone: "success" },
  slightly_snug: { label: "Slightly snug", tone: "warning" },
  snug: { label: "Snug", tone: "danger" },
  slightly_loose: { label: "Slightly loose", tone: "warning" },
  loose: { label: "Loose", tone: "danger" },
};

export const VERIFICATION: Record<Verification, { label: string; tone: "success" | "warning" | "danger" | "muted" }> = {
  verified: { label: "Verified", tone: "success" },
  pending: { label: "Pending review", tone: "warning" },
  unverified: { label: "Unverified", tone: "muted" },
  rejected: { label: "Rejected", tone: "danger" },
};

export const FEEDBACK_FIT = [
  { value: "too_tight", label: "Too tight" },
  { value: "slightly_tight", label: "A bit tight" },
  { value: "just_right", label: "Just right" },
  { value: "slightly_loose", label: "A bit loose" },
  { value: "too_loose", label: "Too loose" },
] as const;

export function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
