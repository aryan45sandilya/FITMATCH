"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DemoDataBadge } from "@/components/brand";
import { Badge, ErrorState, LinkButton, PageHeader, Segmented, Skeleton } from "@/components/ui/primitives";
import { qs } from "@/lib/api";
import { VERIFICATION } from "@/lib/labels";
import type { Verification } from "@/lib/types";
import { useApi } from "@/lib/use-api";

interface ChartRow {
  id: string; name: string; audience: string; market: string; basis: string; source: string; collectedAt: string; verification: Verification;
  verifiedAt: string | null; isDemo: boolean; brandName: string; categoryName: string; sizeCount: number;
}

export default function ChartsPage() {
  return <Suspense><Charts /></Suspense>;
}

function Charts() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("status") ?? "all";
  const { data, error, loading, reload } = useApi<{ charts: ChartRow[] }>(`/admin/charts${qs({ status: status === "all" ? undefined : status })}`);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Size charts" description="Every chart carries its source, collection date and verification status. Editing values resets verification." actions={<LinkButton href="/admin/charts/new"><Plus className="size-4" /> New chart</LinkButton>} />
      <Segmented label="Filter by status" value={status} onChange={(v) => router.replace(`/admin/charts${v === "all" ? "" : `?status=${v}`}`)} className="mb-4"
        options={[{ value: "all", label: "All" }, { value: "unverified", label: "Unverified" }, { value: "pending", label: "Pending" }, { value: "verified", label: "Verified" }, { value: "rejected", label: "Rejected" }]} />
      {error ? <ErrorState message={error.message} onRetry={reload} /> : loading ? <Skeleton className="h-96" /> : (
        <div className="scrollbar-none overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full min-w-[820px] text-[13.5px]">
            <thead><tr className="border-b border-line bg-canvas/60 text-left text-[11px] tracking-[0.06em] text-muted uppercase"><th className="px-4 py-2.5">Chart</th><th className="px-3">Category</th><th className="px-3">Sizes</th><th className="px-3">Source</th><th className="px-3">Collected</th><th className="px-3">Status</th></tr></thead>
            <tbody>
              {data?.charts.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-canvas/40">
                  <td className="px-4 py-3"><Link href={`/admin/charts/${c.id}`} className="font-semibold hover:underline">{c.brandName}</Link><p className="text-[12px] text-muted">{c.name} · {c.market === "GLOBAL" ? "demo" : c.market.replace("_", "/")} · {c.basis}</p></td>
                  <td className="px-3">{c.categoryName}</td>
                  <td className="num px-3">{c.sizeCount}</td>
                  <td className="max-w-56 truncate px-3 text-[12.5px] text-muted" title={c.source}>{c.source}</td>
                  <td className="num px-3 text-[12.5px]">{String(c.collectedAt).slice(0, 10)}</td>
                  <td className="px-3"><span className="flex gap-1.5"><Badge tone={VERIFICATION[c.verification].tone === "muted" ? "muted" : VERIFICATION[c.verification].tone}>{VERIFICATION[c.verification].label}</Badge>{c.isDemo && <DemoDataBadge />}</span></td>
                </tr>
              ))}
              {!data?.charts.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No charts with this status.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
