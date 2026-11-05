"use client";

import { Globe2 } from "lucide-react";
import { MARKET_OPTIONS } from "@/lib/labels";
import { useSession } from "@/lib/session";
import type { Market } from "@/lib/types";
import { Segmented, cn } from "../ui/primitives";
import { useToast } from "../ui/toast";

/** Lets shoppers pick which market's size charts to use (India, US, UK & Europe). */
export function MarketPicker({ variant = "segmented", className, value, onChange }: {
  variant?: "segmented" | "select" | "compact";
  className?: string;
  /** Controlled mode (e.g. compare page override). Defaults to the session market. */
  value?: Market;
  onChange?: (m: Market) => void;
}) {
  const { market, setMarket } = useSession();
  const toast = useToast();
  const current = value ?? market;
  const change = (m: Market) => {
    if (onChange) return onChange(m);
    void setMarket(m);
    toast(`Using ${MARKET_OPTIONS.find((o) => o.value === m)!.label} size charts`, "info");
  };

  if (variant === "select") {
    return (
      <label className={cn("flex items-center gap-2 rounded-sm border border-line bg-canvas/60 px-2.5 py-1.5 text-[12.5px]", className)}>
        <Globe2 className="size-3.5 shrink-0 text-muted" aria-hidden />
        <span className="sr-only">Size chart market</span>
        <select value={current} onChange={(e) => change(e.target.value as Market)} className="w-full bg-transparent font-semibold text-ink outline-none" aria-label="Size chart market">
          {MARKET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} sizing</option>)}
        </select>
      </label>
    );
  }
  return (
    <Segmented
      label="Size chart market"
      size={variant === "compact" ? "sm" : "md"}
      value={current}
      onChange={change}
      className={className}
      options={MARKET_OPTIONS.map((o) => ({ value: o.value, label: variant === "compact" ? o.short : o.label }))}
    />
  );
}
