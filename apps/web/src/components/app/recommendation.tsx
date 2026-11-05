"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Info, Ruler, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { CONFIDENCE, MEASUREMENT_LABEL, POINT_STATUS, QUALITY } from "@/lib/labels";
import type { EngineResult, PointResult, Unit } from "@/lib/types";
import { formatLength, formatRange } from "@/lib/units";
import { DemoDataBadge } from "../brand";
import { Badge, LevelMeter, LinkButton, Notice, cn } from "../ui/primitives";

type Ok = Extract<EngineResult, { status: "ok" }>;

export function RecommendationResult({ result, unit, context, footer }: { result: EngineResult; unit: Unit; context?: React.ReactNode; footer?: React.ReactNode }) {
  if (result.status === "missing_measurements") {
    return (
      <div className="rounded-md border border-accent/30 bg-accent-soft/50 p-6">
        <Ruler className="mb-3 size-6 text-accent" strokeWidth={1.6} />
        <h3 className="text-[18px] font-semibold tracking-[-0.01em]">A few measurements first</h3>
        <p className="mt-1.5 max-w-md text-[14.5px] leading-relaxed text-ink/80">{result.message}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {result.missing.map((k) => <Badge key={k} tone="accent">{MEASUREMENT_LABEL[k]}</Badge>)}
        </div>
        <LinkButton href="/app/measurements" className="mt-5" size="sm">Add measurements</LinkButton>
      </div>
    );
  }
  if (result.status === "insufficient_data") {
    return (
      <div className="rounded-md border border-line-strong bg-surface p-6">
        <Info className="mb-3 size-6 text-muted" strokeWidth={1.6} />
        <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{result.message}</h3>
        <p className="mt-1.5 max-w-md text-[14.5px] leading-relaxed text-muted">{result.detail} Rather than guess, we&apos;d suggest checking the retailer&apos;s own size guide for this item.</p>
      </div>
    );
  }
  return <OkResult r={result} unit={unit} context={context} footer={footer} />;
}

function OkResult({ r, unit, context, footer }: { r: Ok; unit: Unit; context?: React.ReactNode; footer?: React.ReactNode }) {
  const q = QUALITY[r.matchQuality];
  const c = CONFIDENCE[r.confidence];
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      {/* Headline */}
      <div className="grid gap-6 bg-night p-6 text-canvas sm:p-8 md:grid-cols-[auto_1fr] md:gap-10">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#8a877f] uppercase">Your recommended size</p>
          <motion.p
            key={r.recommendedSize}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="num mt-2 font-serif text-[88px] leading-[0.9] tracking-[-0.03em] sm:text-[112px]"
            aria-live="polite"
          >
            {r.recommendedSize}
          </motion.p>
          {context && <div className="mt-3 text-[13px] text-[#a9a69e]">{context}</div>}
        </div>
        <div className="flex flex-col justify-end gap-5">
          <p className="max-w-lg text-[15px] leading-relaxed text-[#e4e1da]">{r.explanation}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between text-[12.5px]">
                <span className="text-[#a9a69e]">Match quality</span>
                <span className="font-semibold">{q.label}</span>
              </div>
              <LevelMeter level={q.level} max={4} tone={q.tone === "danger" ? "danger" : q.tone === "warning" ? "warning" : "success"} label={q.label} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-[12.5px]">
                <span className="text-[#a9a69e]">Confidence</span>
                <span className="font-semibold">{c.label}</span>
              </div>
              <LevelMeter level={c.level} max={3} tone="accent" label={c.label} />
            </div>
          </div>
        </div>
      </div>

      {/* Alternative + data provenance */}
      <div className="grid border-b border-line md:grid-cols-2 md:divide-x md:divide-line">
        <div className="p-5 sm:p-6">
          <p className="eyebrow mb-2">Alternative size</p>
          {r.alternativeSize ? (
            <div className="flex items-start gap-4">
              <span className="num grid h-11 min-w-12 place-items-center rounded-sm border border-ink px-2 text-[18px] font-semibold">{r.alternativeSize}</span>
              <p className="text-[14px] leading-relaxed text-ink/80">{r.alternativeReason}</p>
            </div>
          ) : (
            <p className="text-[14px] text-muted">No close alternative — {r.recommendedSize} is clearly the best match.</p>
          )}
        </div>
        <div className="p-5 sm:p-6">
          <p className="eyebrow mb-2">Why this confidence</p>
          <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-ink/80">
            {r.confidenceReasons.map((reason) => (
              <li key={reason} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />{reason}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="muted">{r.basis === "garment" ? "Garment measurements" : "Brand size chart"}</Badge>
            {r.dataVerification === "verified" ? <Badge tone="success"><ShieldCheck className="size-3" /> Verified data</Badge> : <Badge tone="muted">Unverified data</Badge>}
            {r.isDemoData && <DemoDataBadge />}
          </div>
        </div>
      </div>

      {/* Measurement comparison */}
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold">Measurement comparison</h3>
          <span className="text-[12px] text-muted">Size {r.recommendedSize}</span>
        </div>
        <ul className="space-y-4">
          {r.measurements.map((m) => <MeasurementRow key={m.key} m={m} unit={unit} basis={r.basis} />)}
        </ul>
      </div>

      {/* Size ladder */}
      <div className="border-t border-line p-5 sm:p-6">
        <h3 className="mb-3 text-[13px] font-semibold text-muted">How each size scores for you</h3>
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
          {r.sizes.map((s) => {
            const best = s.size === r.recommendedSize;
            const alt = s.size === r.alternativeSize;
            const lvl = QUALITY[s.quality].level;
            return (
              <div key={s.size} className={cn("flex min-w-14 flex-1 flex-col items-center rounded-sm border px-2 py-2.5", best ? "border-ink bg-ink text-canvas" : alt ? "border-ink" : "border-line")}>
                <span className="num text-[14px] font-semibold">{s.size}</span>
                <span className="mt-1.5 flex gap-0.5" aria-label={QUALITY[s.quality].label}>
                  {[1, 2, 3, 4].map((i) => <span key={i} className={cn("h-1 w-2 rounded-full", i <= lvl ? (best ? "bg-accent" : "bg-ink/70") : best ? "bg-white/20" : "bg-line")} />)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {(r.warnings.length > 0 || r.adjustments.length > 0) && (
        <div className="space-y-2.5 border-t border-line p-5 sm:p-6">
          {r.warnings.map((w) => (
            <Notice key={w} tone="warning" icon={<AlertTriangle className="size-4" />}>{w}</Notice>
          ))}
          {r.adjustments.map((a) => (
            <Notice key={a} tone="accent" icon={<Sparkles className="size-4" />}>{a}</Notice>
          ))}
        </div>
      )}
      {footer && <div className="border-t border-line bg-canvas/50 p-5 sm:p-6">{footer}</div>}
    </div>
  );
}

function MeasurementRow({ m, unit, basis }: { m: PointResult; unit: Unit; basis: "garment" | "body_chart" }) {
  const s = POINT_STATUS[m.status];
  // Position the user on a track: centre = ideal; left = snug; right = loose.
  // diffCm > 0 means room to spare (loose side), < 0 means tighter than intended.
  const pos = Math.max(4, Math.min(96, 50 + (m.diffCm / 8) * 50));
  return (
    <li className="grid gap-2 sm:grid-cols-[170px_1fr_120px] sm:items-center sm:gap-5">
      <div className="flex items-baseline justify-between sm:block">
        <p className="text-[14px] font-semibold">{MEASUREMENT_LABEL[m.key]}</p>
        <p className="num text-[12.5px] text-muted">
          You {formatLength(m.userCm, unit)}
        </p>
      </div>
      <div>
        <div className="relative h-2 rounded-full bg-gradient-to-r from-danger/15 via-success/25 to-warning/15">
          <span className="absolute inset-y-0 left-1/2 w-px bg-ink/25" />
          <motion.span
            className={cn("absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface shadow-[0_0_0_1px_rgba(23,23,23,0.2)]", s.tone === "success" ? "bg-success" : s.tone === "warning" ? "bg-warning" : "bg-danger")}
            initial={{ left: "50%" }}
            animate={{ left: `${pos}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] text-faint">
          <span>Snug</span>
          <span className="num">
            {basis === "body_chart" && m.referenceMinCm !== undefined
              ? `Size range ${formatRange(m.referenceMinCm, m.referenceMaxCm!, unit)}`
              : m.garmentCm !== undefined
                ? `Garment ${formatLength(m.garmentCm, unit)} · target ${formatLength(m.targetCm, unit)}`
                : ""}
          </span>
          <span>Loose</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Badge tone={s.tone === "muted" ? "muted" : s.tone}>{s.label}</Badge>
        <span className="num w-14 text-right text-[12.5px] text-muted sm:hidden">{formatLength(m.diffCm, unit, { signed: true })}</span>
      </div>
    </li>
  );
}

export function QualityText({ quality }: { quality?: string }) {
  if (!quality) return null;
  const q = QUALITY[quality as keyof typeof QUALITY];
  return <span className={cn("text-[12.5px] font-semibold", q.tone === "success" ? "text-success" : q.tone === "warning" ? "text-[#8f6328]" : "text-danger")}>{q.label}</span>;
}

export function NoProfileCallout() {
  return (
    <div className="rounded-md border border-line bg-surface p-6 sm:p-8">
      <Ruler className="mb-4 size-7 text-accent" strokeWidth={1.5} />
      <h2 className="text-[20px] font-semibold tracking-[-0.015em]">Add your measurements to get started</h2>
      <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-muted">Recommendations come from your body measurements. It takes about five minutes, and you can skip anything you don&apos;t need.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <LinkButton href="/onboarding">Create measurement profile</LinkButton>
        <Link href="/size-guide" className="inline-flex h-11 items-center px-3 text-[14px] font-semibold text-muted hover:text-ink">How to measure</Link>
      </div>
    </div>
  );
}
