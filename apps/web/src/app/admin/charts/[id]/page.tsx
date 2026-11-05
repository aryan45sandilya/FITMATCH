"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ALL_KEYS, MeasurementGrid, type GridRow, type RangeCell } from "@/components/admin/measurement-grid";
import { DemoDataBadge } from "@/components/brand";
import { Badge, Button, ErrorState, Field, Input, Notice, PageHeader, Panel, Select, Skeleton, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { VERIFICATION } from "@/lib/labels";
import type { Category, ChartData, MeasurementKey, Verification } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Loaded = ChartData & { brandId: string; categoryId: number; notes: string | null };

export default function ChartEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();
  const toast = useToast();
  const chart = useApi<{ chart: Loaded }>(isNew ? null : `/admin/charts/${id}`);
  const brands = useApi<{ brands: { id: string; name: string }[] }>("/admin/brands");
  const cats = useApi<{ categories: Category[] }>("/admin/categories");

  const [meta, setMeta] = useState({ brandId: "", categoryId: "", audience: "menswear", name: "", basis: "body", source: "", sourceUrl: "", collectedAt: new Date().toISOString().slice(0, 10), notes: "" });
  const [keys, setKeys] = useState<MeasurementKey[]>(["chest", "waist"]);
  const [rows, setRows] = useState<GridRow<RangeCell>[]>(["S", "M", "L"].map((label) => ({ label, cells: {} })));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const c = chart.data?.chart;
    if (!c) return;
    setMeta({ brandId: c.brandId, categoryId: String(c.categoryId), audience: c.audience, name: c.name, basis: c.basis, source: c.isDemo ? "" : c.source, sourceUrl: c.sourceUrl ?? "", collectedAt: String(c.collectedAt).slice(0, 10), notes: c.notes ?? "" });
    const used = new Set(c.sizes.flatMap((s) => Object.keys(s.points)));
    setKeys(ALL_KEYS.filter((k) => used.has(k)));
    setRows(c.sizes.map((s) => ({ label: s.label, cells: Object.fromEntries(Object.entries(s.points).map(([k, r]) => [k, { min: String(r!.min), max: String(r!.max) }])) })));
  }, [chart.data]);

  async function save() {
    setBusy(true);
    setErrs({});
    setMsg(undefined);
    const body = {
      brandId: meta.brandId, categoryId: Number(meta.categoryId), audience: meta.audience, name: meta.name, basis: meta.basis,
      source: meta.source, sourceUrl: meta.sourceUrl || null, collectedAt: meta.collectedAt, notes: meta.notes || null,
      sizes: rows.filter((r) => r.label.trim()).map((r) => ({
        label: r.label.trim(),
        points: Object.fromEntries(keys.filter((k) => r.cells[k]?.min && r.cells[k]?.max).map((k) => [k, { min: Number(r.cells[k]!.min), max: Number(r.cells[k]!.max) }])),
      })),
    };
    try {
      if (isNew) {
        const r = await api.post<{ id: string }>("/admin/charts", body);
        toast("Chart created");
        router.replace(`/admin/charts/${r.id}`);
      } else {
        await api.put(`/admin/charts/${id}`, body);
        toast("Chart saved — verification reset to unverified");
        await chart.reload();
      }
    } catch (err) {
      if (err instanceof ApiError) { setErrs(err.details ?? {}); setMsg(err.message); }
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: Verification) {
    setVerifying(true);
    setMsg(undefined);
    try {
      await api.post(`/admin/charts/${id}/verification`, { status });
      toast(`Marked ${VERIFICATION[status].label.toLowerCase()}`);
      await chart.reload();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Couldn't update status");
    } finally {
      setVerifying(false);
    }
  }

  if (chart.error) return <ErrorState message={chart.error.message} onRetry={chart.reload} />;
  if (!isNew && !chart.data) return <Skeleton className="h-[600px]" />;
  const current = chart.data?.chart;
  const set = (k: keyof typeof meta) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setMeta((m) => ({ ...m, [k]: e.target.value }));

  return (
    <>
      <Link href="/admin/charts" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"><ArrowLeft className="size-4" /> Size charts</Link>
      <PageHeader eyebrow={isNew ? "New size chart" : "Edit size chart"} title={isNew ? "Add a size chart" : current!.name}
        actions={current && <span className="flex gap-1.5"><Badge tone={VERIFICATION[current.verification].tone === "muted" ? "muted" : VERIFICATION[current.verification].tone}>{VERIFICATION[current.verification].label}</Badge>{current.isDemo && <DemoDataBadge />}</span>} />

      {current?.isDemo && <Notice tone="warning" className="mb-5">This is demonstration data and can&apos;t be verified. Replace the values with the brand&apos;s published chart, cite the source, and save — it will stop being marked as demo.</Notice>}
      {msg && <Notice tone="danger" className="mb-5">{msg} {Object.values(errs).length > 0 && <span className="block text-[12px]">{Object.entries(errs).map(([k, v]) => `${k}: ${v}`).join(" · ")}</span>}</Notice>}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Panel title="Chart">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand" htmlFor="c-brand" error={errs.brandId}><Select id="c-brand" value={meta.brandId} onChange={set("brandId")}><option value="">Choose…</option>{brands.data?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
              <Field label="Category" htmlFor="c-cat" error={errs.categoryId}><Select id="c-cat" value={meta.categoryId} onChange={set("categoryId")}><option value="">Choose…</option>{cats.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
              <Field label="Name" htmlFor="c-name" error={errs.name}><Input id="c-name" value={meta.name} onChange={set("name")} placeholder="Men's tops — size guide" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Audience" htmlFor="c-aud"><Select id="c-aud" value={meta.audience} onChange={set("audience")}>{["menswear", "womenswear", "unisex"].map((a) => <option key={a} value={a}>{a}</option>)}</Select></Field>
                <Field label="Basis" htmlFor="c-basis"><Select id="c-basis" value={meta.basis} onChange={set("basis")}><option value="body">Body</option><option value="garment">Garment</option></Select></Field>
              </div>
            </div>
          </Panel>
          <Panel title="Measurements (cm)">
            <p className="mb-4 text-[13px] text-muted">For body charts, enter the body measurement range each size is designed for.</p>
            <MeasurementGrid mode="range" keys={keys} setKeys={setKeys} rows={rows} setRows={setRows} />
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Provenance">
            <div className="space-y-4">
              <Field label="Source" htmlFor="c-src" error={errs.source} hint="Where these numbers came from."><Input id="c-src" value={meta.source} onChange={set("source")} placeholder="Brand size guide page" /></Field>
              <Field label="Source URL" htmlFor="c-url" error={errs.sourceUrl} hint="Required before verifying."><Input id="c-url" value={meta.sourceUrl} onChange={set("sourceUrl")} placeholder="https://" /></Field>
              <Field label="Date collected" htmlFor="c-date" error={errs.collectedAt}><Input id="c-date" type="date" value={meta.collectedAt} onChange={set("collectedAt")} /></Field>
              <Field label="Notes" htmlFor="c-notes" optional><Textarea id="c-notes" value={meta.notes} onChange={set("notes")} /></Field>
              <Button full onClick={save} loading={busy}>{isNew ? "Create chart" : "Save changes"}</Button>
            </div>
          </Panel>
          {!isNew && current && (
            <Panel title="Verification">
              <p className="mb-3 text-[13px] text-muted">
                {current.verification === "verified" ? "Labelled as officially verified across the app." : "Only verify after checking every value against the cited source."}
              </p>
              <div className="grid gap-2">
                <Button variant="accent" onClick={() => setStatus("verified")} loading={verifying} disabled={current.verification === "verified" || current.isDemo}><ShieldCheck className="size-4" /> Mark verified</Button>
                <Button variant="secondary" onClick={() => setStatus("pending")} disabled={verifying || current.verification === "pending"}>Send for review</Button>
                <Button variant="danger" onClick={() => setStatus("rejected")} disabled={verifying || current.verification === "rejected"}>Reject (stop using)</Button>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
