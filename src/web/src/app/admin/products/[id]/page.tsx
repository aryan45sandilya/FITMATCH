"use client";

import { ArrowLeft, ImagePlus, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ALL_KEYS, MeasurementGrid, type GridRow } from "@/components/admin/measurement-grid";
import { ProductImage } from "@/components/app/product";
import { DemoDataBadge } from "@/components/brand";
import { Button, Checkbox, ErrorState, Field, Input, Notice, PageHeader, Panel, Select, Skeleton, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, qs } from "@/lib/api";
import { FIT_OPTIONS, VERIFICATION } from "@/lib/labels";
import type { Category, MeasurementKey, Verification } from "@/lib/types";
import { useApi } from "@/lib/use-api";

interface AdminProduct {
  id: string; brandId: string; categoryId: number; sizeChartId: string | null; slug: string; name: string; description: string | null;
  fitType: string; fabric: string | null; stretch: string; audience: string; price: number | null; currency: string; imageUrls: string[];
  colorway: string | null; externalUrl: string | null; isActive: boolean; isDemo: boolean;
}
interface MarketPrice { market: "IN" | "US" | "UK_EU"; amount: number; currency: string; isDemo: boolean }
const PRICE_MARKETS = [["IN", "India", "INR"], ["US", "United States", "USD"], ["UK_EU", "UK & Europe", "GBP"]] as const;

interface Variant { id: string; label: string; isOffered: boolean; measurements: { key: MeasurementKey; valueCm: number; source: string; collectedAt: string; verification: Verification }[] }

export default function AdminProductEdit() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ product: AdminProduct; variants: Variant[]; prices: MarketPrice[] }>(`/admin/products/${id}`);
  const [prices, setPrices] = useState<Record<string, { amount: string; currency: string; isDemo: boolean }>>({});
  const [savingPrices, setSavingPrices] = useState(false);
  const cats = useApi<{ categories: Category[] }>("/admin/categories");
  const brands = useApi<{ brands: { id: string; name: string }[] }>("/admin/brands");
  const [p, setP] = useState<AdminProduct | null>(null);
  const charts = useApi<{ charts: { id: string; name: string; categoryId: number; verification: string }[] }>(p ? `/admin/charts${qs({ brandId: p.brandId })}` : null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [newImage, setNewImage] = useState("");
  const [uploading, setUploading] = useState(false);

  // garment grid
  const [keys, setKeys] = useState<MeasurementKey[]>([]);
  const [rows, setRows] = useState<GridRow<string>[]>([]);
  const [prov, setProv] = useState({ source: "", collectedAt: new Date().toISOString().slice(0, 10), verification: "unverified" as Verification });
  const [savingSizes, setSavingSizes] = useState(false);
  const [sizeMsg, setSizeMsg] = useState<string>();

  useEffect(() => {
    if (!data) return;
    setP(data.product);
    setPrices(Object.fromEntries(data.prices.map((x) => [x.market, { amount: String(x.amount), currency: x.currency, isDemo: x.isDemo }])));
    const used = new Set(data.variants.flatMap((v) => v.measurements.map((m) => m.key)));
    setKeys(ALL_KEYS.filter((k) => used.has(k)));
    setRows(data.variants.map((v) => ({ label: v.label, cells: Object.fromEntries(v.measurements.map((m) => [m.key, String(m.valueCm)])) })));
    const first = data.variants.flatMap((v) => v.measurements)[0];
    if (first) setProv({ source: first.source, collectedAt: String(first.collectedAt).slice(0, 10), verification: first.verification });
  }, [data]);

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (loading || !p) return <Skeleton className="h-[600px]" />;

  const set = <K extends keyof AdminProduct>(k: K, v: AdminProduct[K]) => setP((x) => (x ? { ...x, [k]: v } : x));

  async function saveProduct(e?: React.FormEvent) {
    e?.preventDefault();
    if (!p) return;
    setSaving(true);
    setErrs({});
    try {
      await api.patch(`/admin/products/${id}`, {
        name: p.name, slug: p.slug, description: p.description || null, fitType: p.fitType, fabric: p.fabric || null, stretch: p.stretch,
        audience: p.audience, price: p.price, currency: p.currency, imageUrls: p.imageUrls, colorway: p.colorway || null,
        externalUrl: p.externalUrl || null, isActive: p.isActive, sizeChartId: p.sizeChartId, categoryId: p.categoryId, brandId: p.brandId,
      });
      toast("Product saved");
    } catch (err) {
      if (err instanceof ApiError) { setErrs(err.details ?? { _: err.message }); toast(err.message, "error"); }
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const sig = await api.post<{ uploadUrl: string; apiKey: string; timestamp: number; folder: string; signature: string }>("/admin/uploads/signature");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("folder", sig.folder);
      fd.append("signature", sig.signature);
      const res = await fetch(sig.uploadUrl, { method: "POST", body: fd });
      const body = (await res.json()) as { secure_url?: string; error?: { message: string } };
      if (!res.ok || !body.secure_url) throw new Error(body.error?.message ?? "Upload failed");
      set("imageUrls", [...p!.imageUrls, body.secure_url]);
      toast("Image uploaded — save the product to keep it");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  async function saveSizes() {
    setSavingSizes(true);
    setSizeMsg(undefined);
    try {
      await api.put(`/admin/products/${id}/sizes`, {
        ...prov,
        sizes: rows.filter((r) => r.label.trim()).map((r) => ({
          label: r.label.trim(),
          measurements: Object.fromEntries(keys.map((k) => [k, r.cells[k] ? Number(r.cells[k]) : null])),
        })),
      });
      toast("Sizes and garment measurements saved");
      await reload();
    } catch (err) {
      setSizeMsg(err instanceof ApiError ? `${err.message} ${Object.values(err.details ?? {}).join(" ")}` : "Couldn't save");
    } finally {
      setSavingSizes(false);
    }
  }

  async function savePrices() {
    setSavingPrices(true);
    try {
      await api.put(`/admin/products/${id}/prices`, {
        prices: Object.fromEntries(PRICE_MARKETS.map(([m, , cur]) => {
          const v = prices[m];
          return [m, v && v.amount.trim() ? { amount: Number(v.amount), currency: v.currency || cur } : null];
        })),
      });
      toast("Market prices saved");
      await reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't save prices", "error");
    } finally {
      setSavingPrices(false);
    }
  }

  const chartOptions = (charts.data?.charts ?? []).filter((c) => c.categoryId === p.categoryId);

  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"><ArrowLeft className="size-4" /> Products</Link>
      <PageHeader eyebrow="Edit product" title={p.name} actions={<>{p.isDemo && <DemoDataBadge />}<Link href={`/app/products/${p.slug}`} className="text-[13px] font-semibold underline-offset-2 hover:underline">View in app</Link></>} />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Panel title="Details">
          <form onSubmit={saveProduct} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="ap-name" error={errs.name}><Input id="ap-name" value={p.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Slug" htmlFor="ap-slug" error={errs.slug}><Input id="ap-slug" value={p.slug} onChange={(e) => set("slug", e.target.value)} /></Field>
            <Field label="Brand" htmlFor="ap-brand"><Select id="ap-brand" value={p.brandId} onChange={(e) => set("brandId", e.target.value)}>{brands.data?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
            <Field label="Category" htmlFor="ap-cat"><Select id="ap-cat" value={p.categoryId} onChange={(e) => set("categoryId", Number(e.target.value))}>{cats.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Fit type" htmlFor="ap-fit"><Select id="ap-fit" value={p.fitType} onChange={(e) => set("fitType", e.target.value)}>{FIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>
            <Field label="Fabric stretch" htmlFor="ap-stretch"><Select id="ap-stretch" value={p.stretch} onChange={(e) => set("stretch", e.target.value)}>{["none", "low", "medium", "high"].map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
            <Field label="Audience" htmlFor="ap-aud"><Select id="ap-aud" value={p.audience} onChange={(e) => set("audience", e.target.value)}>{["menswear", "womenswear", "unisex"].map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
            <Field label="Size chart" htmlFor="ap-chart" hint="Fallback when garment data is missing. Empty = best available."><Select id="ap-chart" value={p.sizeChartId ?? ""} onChange={(e) => set("sizeChartId", e.target.value || null)}><option value="">Automatic</option>{chartOptions.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.verification})</option>)}</Select></Field>
            <Field label="Price" htmlFor="ap-price"><Input id="ap-price" inputMode="decimal" value={p.price ?? ""} onChange={(e) => set("price", e.target.value ? Number(e.target.value.replace(/[^\d.]/g, "")) : null)} /></Field>
            <Field label="Currency" htmlFor="ap-cur"><Input id="ap-cur" maxLength={3} value={p.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} /></Field>
            <Field label="Retailer URL" htmlFor="ap-url" error={errs.externalUrl} className="sm:col-span-2"><Input id="ap-url" value={p.externalUrl ?? ""} onChange={(e) => set("externalUrl", e.target.value)} placeholder="https://" /></Field>
            <Field label="Fabric" htmlFor="ap-fabric"><Input id="ap-fabric" value={p.fabric ?? ""} onChange={(e) => set("fabric", e.target.value)} /></Field>
            <Field label="Colorway (illustration)" htmlFor="ap-color" error={errs.colorway}><Input id="ap-color" value={p.colorway ?? ""} onChange={(e) => set("colorway", e.target.value)} placeholder="#D8D2C6" /></Field>
            <Field label="Description" htmlFor="ap-desc" className="sm:col-span-2"><Textarea id="ap-desc" value={p.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
            <div className="sm:col-span-2"><Checkbox checked={p.isActive} onChange={(v) => set("isActive", v)} label="Visible to users" /></div>
            {errs._ && <Notice tone="danger" className="sm:col-span-2">{errs._}</Notice>}
            <div className="sm:col-span-2"><Button type="submit" loading={saving}>Save details</Button></div>
          </form>
        </Panel>

        <Panel title="Images" className="self-start">
          <ProductImage product={{ ...p, category: { slug: cats.data?.categories.find((c) => c.id === p.categoryId)?.slug ?? "t-shirts" } }} className="aspect-[4/5] rounded-sm" sizes="340px" />
          <ul className="mt-3 space-y-1.5">
            {p.imageUrls.map((u, i) => (
              <li key={u} className="flex items-center gap-2 text-[12px]">
                <span className="min-w-0 flex-1 truncate text-muted">{i + 1}. {u}</span>
                <button type="button" onClick={() => set("imageUrls", p.imageUrls.filter((x) => x !== u))} className="text-muted hover:text-danger" aria-label="Remove image"><Trash2 className="size-3.5" /></button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Input value={newImage} onChange={(e) => setNewImage(e.target.value)} placeholder="https://image URL" className="h-9" aria-label="Image URL" />
            <Button size="sm" variant="secondary" disabled={!newImage.startsWith("https://")} onClick={() => { set("imageUrls", [...p.imageUrls, newImage]); setNewImage(""); }}><ImagePlus className="size-3.5" /></Button>
          </div>
          <label className="mt-2 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-line-strong text-[12.5px] font-semibold text-muted hover:text-ink">
            <Upload className="size-3.5" /> {uploading ? "Uploading…" : "Upload to Cloudinary"}
            <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          <p className="mt-2 text-[11.5px] text-faint">Remember to save details after changing images.</p>
        </Panel>
      </div>

      <Panel title="Prices by market" className="mt-5">
        <p className="mb-4 text-[13px] text-muted">Brands price each market separately. Leave a market empty to fall back to the base price above.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {PRICE_MARKETS.map(([m, label, cur]) => {
            const v = prices[m] ?? { amount: "", currency: cur, isDemo: false };
            return (
              <Field key={m} label={label} htmlFor={`price-${m}`} hint={v.isDemo ? "Demo price — replace with the brand's real price." : undefined}>
                <div className="flex gap-2">
                  <Input id={`price-${m}`} inputMode="decimal" value={v.amount} placeholder="—"
                    onChange={(e) => setPrices((x) => ({ ...x, [m]: { ...v, amount: e.target.value.replace(/[^d.]/g, ""), isDemo: false } }))} />
                  <Input aria-label={`${label} currency`} className="w-20" maxLength={3} value={v.currency}
                    onChange={(e) => setPrices((x) => ({ ...x, [m]: { ...v, currency: e.target.value.toUpperCase() } }))} />
                </div>
              </Field>
            );
          })}
        </div>
        <Button className="mt-4" variant="secondary" onClick={savePrices} loading={savingPrices}>Save market prices</Button>
      </Panel>

      <Panel title="Sizes & garment measurements" className="mt-5">
        <p className="mb-4 text-[13px] leading-relaxed text-muted">Flat-measured finished garment, in centimetres. Enter circumferences in full (double a flat half-chest). Leave a cell empty to omit it. Provenance applies to every value saved.</p>
        <MeasurementGrid mode="value" keys={keys} setKeys={setKeys} rows={rows} setRows={setRows} />
        <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
          <Field label="Source" htmlFor="pv-src" hint="e.g. brand product page, measured in store"><Input id="pv-src" value={prov.source} onChange={(e) => setProv((x) => ({ ...x, source: e.target.value }))} /></Field>
          <Field label="Date collected" htmlFor="pv-date"><Input id="pv-date" type="date" value={prov.collectedAt} onChange={(e) => setProv((x) => ({ ...x, collectedAt: e.target.value }))} /></Field>
          <Field label="Verification" htmlFor="pv-ver" hint="Only mark verified when checked against the cited source.">
            <Select id="pv-ver" value={prov.verification} onChange={(e) => setProv((x) => ({ ...x, verification: e.target.value as Verification }))}>
              {(Object.keys(VERIFICATION) as Verification[]).map((v) => <option key={v} value={v}>{VERIFICATION[v].label}</option>)}
            </Select>
          </Field>
        </div>
        {sizeMsg && <Notice tone="danger" className="mt-4">{sizeMsg}</Notice>}
        <Button className="mt-4" onClick={saveSizes} loading={savingSizes} disabled={prov.source.trim().length < 3 || !rows.length}>Save sizes & measurements</Button>
      </Panel>
    </>
  );
}
