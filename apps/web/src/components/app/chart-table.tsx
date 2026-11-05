"use client";

import { ExternalLink, ShieldCheck } from "lucide-react";
import { MEASUREMENT_LABEL, VERIFICATION } from "@/lib/labels";
import type { ChartData, GarmentData, MeasurementKey, Unit } from "@/lib/types";
import { formatLength, formatRange } from "@/lib/units";
import { DemoDataBadge } from "../brand";
import { Badge, cn } from "../ui/primitives";

const ORDER: MeasurementKey[] = ["chest", "shoulder", "neck", "sleeve", "arm_length", "bicep", "waist", "hip", "thigh", "inseam", "outseam", "calf", "body_length"];

/** Size chart (body ranges) or garment measurement table, with provenance. */
export function SizeTable({
  chart, garment, unit, highlight, caption,
}: { chart?: ChartData | null; garment?: GarmentData | null; unit: Unit; highlight?: string | null; caption?: string }) {
  const sizes = garment?.sizes ?? chart?.sizes ?? [];
  const keys = ORDER.filter((k) => sizes.some((s) => (s.points as Record<string, unknown>)[k]));
  if (!sizes.length || !keys.length) return null;
  const isGarment = Boolean(garment);

  return (
    <figure className="overflow-hidden rounded-md border border-line bg-surface">
      {caption && <figcaption className="border-b border-line px-4 py-3 text-[13px] font-semibold">{caption}</figcaption>}
      <div className="scrollbar-none overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line bg-canvas/70 text-left">
              <th scope="col" className="sticky left-0 bg-[#f9f8f5] px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Size</th>
              {keys.map((k) => (
                <th key={k} scope="col" className="px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-muted uppercase">
                  {MEASUREMENT_LABEL[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizes.map((s) => {
              const on = highlight === s.label;
              return (
                <tr key={s.label} className={cn("border-b border-line last:border-0", on && "bg-accent-soft/60")}>
                  <th scope="row" className={cn("sticky left-0 px-4 py-2.5 text-left font-semibold", on ? "bg-[#f6efe6]" : "bg-surface")}>
                    <span className="num">{s.label}</span>
                    {on && <span className="ml-2 text-[10.5px] font-semibold tracking-[0.06em] text-accent uppercase">Yours</span>}
                  </th>
                  {keys.map((k) => {
                    const v = (s.points as Record<string, { min?: number; max?: number; value?: number } | undefined>)[k];
                    return (
                      <td key={k} className="num px-4 py-2.5 whitespace-nowrap text-ink/85">
                        {!v ? "—" : v.value !== undefined ? formatLength(v.value, unit) : formatRange(v.min!, v.max!, unit)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Provenance chart={isGarment ? null : chart} garment={garment} />
    </figure>
  );
}

export function Provenance({ chart, garment }: { chart?: ChartData | null; garment?: GarmentData | null }) {
  const v = garment?.verification ?? chart?.verification ?? "unverified";
  const isDemo = garment?.isDemo ?? chart?.isDemo ?? false;
  const source = garment?.source ?? chart?.source;
  const collected = garment?.collectedAt ?? chart?.collectedAt;
  const meta = VERIFICATION[v];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-canvas/50 px-4 py-3 text-[12px] text-muted">
      {v === "verified" ? (
        <Badge tone="success"><ShieldCheck className="size-3" /> Officially verified</Badge>
      ) : (
        <Badge tone={meta.tone === "muted" ? "muted" : meta.tone}>{meta.label}</Badge>
      )}
      {isDemo && <DemoDataBadge />}
      <span>{garment ? "Garment measurements" : chart?.basis === "garment" ? "Garment chart" : "Body measurement chart"}</span>
      {source && <span className="min-w-0">Source: {source}</span>}
      {collected && <span>Collected {new Date(collected).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>}
      {chart?.sourceUrl && (
        <a href={chart.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink underline-offset-2 hover:underline">
          View source <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}
