"use client";

import Link from "next/link";
import { Badge, ErrorState, Notice, PageHeader, Panel, Skeleton } from "@/components/ui/primitives";
import { useApi } from "@/lib/use-api";

interface Overview {
  counts: Record<string, number>;
  performance: { rated: number; bought_recommended: number; recommended_just_right: number; recommended_tight: number; recommended_loose: number };
  feedbackByBrand: { brand: string; n: number; just_right: number; tight: number; loose: number }[];
  qualityDistribution: { bucket: string; n: number }[];
  cloudinaryEnabled: boolean;
}

export default function AdminOverview() {
  const { data, error, loading, reload } = useApi<Overview>("/admin/overview");
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (loading || !data) return <Skeleton className="h-96" />;
  const c = data.counts;
  const perf = data.performance;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const totalRecs = data.qualityDistribution.reduce((s, x) => s + x.n, 0);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Operations overview" description="Catalogue health, data verification and how well recommendations are holding up against real feedback." />

      {c.demo_charts! > 0 && (
        <Notice tone="warning" className="mb-6">
          {c.demo_charts} size chart{c.demo_charts === 1 ? " is" : "s are"} demonstration data. Replace with sourced charts and verify them before launch. <Link href="/admin/charts?status=unverified" className="font-semibold underline">Review charts</Link>
        </Notice>
      )}

      <dl className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-4 lg:grid-cols-6">
        {[
          ["Users", c.users], ["Profiles", c.profiles], ["Brands", c.brands], ["Products", c.products],
          ["Size charts", c.charts], ["Verified charts", c.verified_charts], ["Pending review", c.pending_charts],
          ["Recommendations", c.recommendations], ["Insufficient data", c.insufficient], ["Feedback", c.feedback], ["Flagged feedback", c.flagged_feedback],
        ].map(([label, n]) => (
          <div key={label as string} className="bg-surface p-4">
            <dt className="text-[12px] text-muted">{label}</dt>
            <dd className="num mt-1 text-[24px] font-semibold tracking-[-0.02em]">{n as number}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Recommendation performance">
          {perf.rated === 0 ? (
            <p className="text-[13.5px] text-muted">No feedback linked to a recommendation yet. Metrics appear once users report how recommended sizes fit.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-[13px]">
              <div><dt className="text-muted">Feedback with a known recommendation</dt><dd className="num text-[22px] font-semibold">{perf.rated}</dd></div>
              <div><dt className="text-muted">Bought the recommended size</dt><dd className="num text-[22px] font-semibold">{pct(perf.bought_recommended, perf.rated)}</dd></div>
              <div><dt className="text-muted">…and it fit just right</dt><dd className="num text-[22px] font-semibold text-success">{pct(perf.recommended_just_right, perf.bought_recommended)}</dd></div>
              <div><dt className="text-muted">…ran tight / loose</dt><dd className="num text-[22px] font-semibold">{pct(perf.recommended_tight, perf.bought_recommended)} / {pct(perf.recommended_loose, perf.bought_recommended)}</dd></div>
            </dl>
          )}
          <p className="mt-4 text-[12px] text-faint">Computed live from active (non-excluded) fit feedback.</p>
        </Panel>

        <Panel title="Match quality of recommendations">
          {totalRecs === 0 ? (
            <p className="text-[13.5px] text-muted">No recommendations yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.qualityDistribution.map((q) => (
                <li key={q.bucket} className="grid grid-cols-[130px_1fr_40px] items-center gap-3 text-[13px]">
                  <span className="capitalize">{q.bucket.replace("_", " ")}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-ink" style={{ width: `${(q.n / totalRecs) * 100}%` }} /></span>
                  <span className="num text-right text-muted">{q.n}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Feedback by brand" padded={false}>
          {data.feedbackByBrand.length === 0 ? (
            <p className="p-5 text-[13.5px] text-muted">No feedback yet.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-line text-left text-[11px] tracking-[0.06em] text-muted uppercase"><th className="px-5 py-2.5">Brand</th><th className="px-3">Reports</th><th className="px-3">Right</th><th className="px-3">Tight</th><th className="px-3">Loose</th></tr></thead>
              <tbody>
                {data.feedbackByBrand.map((b) => (
                  <tr key={b.brand} className="border-b border-line last:border-0"><td className="px-5 py-2.5 font-semibold">{b.brand}</td><td className="num px-3">{b.n}</td><td className="num px-3 text-success">{b.just_right}</td><td className="num px-3">{b.tight}</td><td className="num px-3">{b.loose}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Integrations">
          <ul className="space-y-2 text-[13.5px]">
            <li className="flex items-center justify-between">Cloudinary image uploads {data.cloudinaryEnabled ? <Badge tone="success">Configured</Badge> : <Badge tone="muted">Not configured</Badge>}</li>
            <li className="flex items-center justify-between">Email delivery <Badge tone="muted">Console only</Badge></li>
          </ul>
          <p className="mt-3 text-[12px] text-faint">Set CLOUDINARY_* env vars on the API to enable uploads. Without them, paste https image URLs.</p>
        </Panel>
      </div>
    </>
  );
}
