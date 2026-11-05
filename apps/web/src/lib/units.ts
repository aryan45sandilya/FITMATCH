import type { Unit } from "./types";

export const CM_PER_IN = 2.54;
export const KG_PER_LB = 0.45359237;

export const toDisplay = (cm: number, unit: Unit) => (unit === "in" ? cm / CM_PER_IN : cm);
export const fromDisplay = (value: number, unit: Unit) => (unit === "in" ? value * CM_PER_IN : value);

export function formatLength(cm: number | null | undefined, unit: Unit, opts: { signed?: boolean; withUnit?: boolean } = {}) {
  if (cm === null || cm === undefined || Number.isNaN(cm)) return "—";
  const v = toDisplay(cm, unit);
  const rounded = unit === "in" ? Math.round(v * 4) / 4 : Math.round(v * 10) / 10;
  const text = (opts.signed && rounded > 0 ? "+" : "") + (unit === "in" ? trimZeros(rounded.toFixed(2)) : trimZeros(rounded.toFixed(1)));
  return opts.withUnit === false ? text : `${text} ${unit === "in" ? "in" : "cm"}`;
}

export function formatRange(min: number, max: number, unit: Unit) {
  return `${formatLength(min, unit, { withUnit: false })}–${formatLength(max, unit)}`;
}

export function formatHeight(cm: number | null | undefined, unit: Unit) {
  if (!cm) return "—";
  if (unit === "cm") return `${Math.round(cm)} cm`;
  const totalIn = cm / CM_PER_IN;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return inch === 12 ? `${ft + 1}′0″` : `${ft}′${inch}″`;
}

export function formatWeight(kg: number | null | undefined, unit: Unit) {
  if (!kg) return "—";
  return unit === "in" ? `${Math.round(kg / KG_PER_LB)} lb` : `${Math.round(kg * 10) / 10} kg`;
}

function trimZeros(s: string) {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

export function formatPrice(amount: number | null, currency: string) {
  if (amount === null) return "";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
