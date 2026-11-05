"use client";

import { useState } from "react";
import { ALL_BODY_KEYS, MEASUREMENT_LABEL } from "@/lib/labels";
import type { BodyKey, Category, MeasurementPoint } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { BodyDiagram } from "../illustrations/body-diagram";
import { Badge, ErrorState, Skeleton, cn } from "../ui/primitives";

export function MeasurementGuide() {
  const points = useApi<{ points: MeasurementPoint[] }>("/measurement-points");
  const cats = useApi<{ categories: Category[] }>("/categories");
  const [focus, setFocus] = useState<BodyKey>("chest");

  if (points.error) return <ErrorState message={points.error.message} onRetry={points.reload} />;
  const list = (points.data?.points ?? []).filter((p) => ALL_BODY_KEYS.includes(p.key as BodyKey));
  const active = list.find((p) => p.key === focus);

  return (
    <div className="space-y-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="aspect-[340/480] max-h-[640px] w-full rounded-md border border-line bg-surface">
            <BodyDiagram focus={focus} visible={ALL_BODY_KEYS} />
          </div>
        </div>
        <div>
          {points.loading && <Skeleton className="h-96 w-full" />}
          <ol className="divide-y divide-line border-y border-line">
            {list.map((p, i) => {
              const on = p.key === focus;
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => setFocus(p.key as BodyKey)}
                    onMouseEnter={() => setFocus(p.key as BodyKey)}
                    className="grid w-full grid-cols-[40px_1fr] gap-3 py-5 text-left"
                    aria-expanded={on}
                  >
                    <span className={cn("num pt-0.5 text-[12px] font-semibold", on ? "text-accent" : "text-faint")}>{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="flex items-center gap-2">
                        <span className={cn("text-[17px] font-semibold tracking-[-0.01em]", on ? "text-ink" : "text-ink/80")}>{p.label}</span>
                        <Badge tone="muted">{p.region === "upper" ? "Upper body" : "Lower body"}</Badge>
                      </span>
                      <span className="mt-1 block text-[13.5px] text-muted">{p.description}</span>
                      {on && <span className="mt-3 block text-[14.5px] leading-relaxed text-ink/85">{p.howToMeasure}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {active && <p className="sr-only" aria-live="polite">{active.label}: {active.howToMeasure}</p>}
          <div className="mt-8 rounded-md bg-night p-6 text-[14px] leading-relaxed text-[#d4d1ca]">
            <p className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-[#8a877f] uppercase">General tips</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Use a soft tape measure and wear light, close-fitting clothes.</li>
              <li>Keep the tape level and snug — not tight — and breathe normally.</li>
              <li>Ask someone to help with shoulders, sleeve and inseam for best accuracy.</li>
              <li>Measure twice. If the numbers differ, use the average.</li>
            </ul>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-[22px] font-semibold tracking-[-0.02em]">What each category needs</h2>
        <p className="mb-6 max-w-2xl text-[14.5px] text-muted">
          You never need every measurement. <strong className="font-semibold text-ink">Required</strong> measurements are needed for a recommendation at all; the others make it more precise.
        </p>
        {cats.loading && <Skeleton className="h-64 w-full" />}
        <div className="scrollbar-none overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[11px] tracking-[0.08em] text-muted uppercase">
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Required</th>
                <th className="px-5 py-3 font-semibold">Improves accuracy</th>
              </tr>
            </thead>
            <tbody>
              {cats.data?.categories.map((c) => {
                const extra = (Object.keys(c.weights) as BodyKey[]).filter((k) => !c.requiredMeasurements.includes(k));
                return (
                  <tr key={c.slug} className="border-b border-line last:border-0">
                    <th scope="row" className="px-5 py-3.5 text-left font-semibold">{c.name}</th>
                    <td className="px-5 py-3.5">{c.requiredMeasurements.map((k) => MEASUREMENT_LABEL[k]).join(", ")}</td>
                    <td className="px-5 py-3.5 text-muted">{extra.map((k) => MEASUREMENT_LABEL[k]).join(", ") || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
