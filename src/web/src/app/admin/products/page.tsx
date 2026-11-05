"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DemoDataBadge } from "@/components/brand";
import { Badge, Button, ErrorState, Field, Input, Notice, PageHeader, Panel, Select, Skeleton } from "@/components/ui/primitives";
import { api, ApiError, qs } from "@/lib/api";
import { FIT_OPTIONS } from "@/lib/labels";
import type { Category } from "@/lib/types";
import { useApi } from "@/lib/use-api";

interface Row {
  id: string; slug: string; name: string; fitType: string; isActive: boolean; isDemo: boolean; price: number | null; currency: string;
  brandName: string; categoryName: string; sizeCount: number; measurementCount: number; verifiedCount: number;
}

export default function AdminProducts() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data, error, loading, reload } = useApi<{ products: Row[] }>(`/admin/products${qs({ search })}`);
  const brands = useApi<{ brands: { id: string; name: string }[] }>("/admin/brands");
  const cats = useApi<{ categories: Category[] }>("/admin/categories");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", brandId: "", categoryId: "", fitType: "regular", sizes: "S, M, L, XL" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrs({});
    try {
      const r = await api.post<{ id: string }>("/admin/products", {
        name: form.name, slug: form.slug, brandId: form.brandId, categoryId: Number(form.categoryId), fitType: form.fitType,
        sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      });
      router.push(`/admin/products/${r.id}`);
    } catch (err) {
      if (err instanceof ApiError) { setErrs(err.details ?? {}); setMsg(err.message); }
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Products" actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> Add product</Button>} />
      {creating && (
        <Panel title="New product" className="mb-5">
          <form onSubmit={create} className="grid gap-4 md:grid-cols-3">
            {msg && <Notice tone="danger" className="md:col-span-3">{msg}</Notice>}
            <Field label="Name" htmlFor="p-name" error={errs.name}><Input id="p-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || "" }))} /></Field>
            <Field label="Slug" htmlFor="p-slug" error={errs.slug}><Input id="p-slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="brand-product-name" /></Field>
            <Field label="Brand" htmlFor="p-brand" error={errs.brandId}>
              <Select id="p-brand" value={form.brandId} onChange={(e) => setForm((f) => ({ ...f, brandId: e.target.value }))}><option value="">Choose…</option>{brands.data?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
            </Field>
            <Field label="Category" htmlFor="p-cat" error={errs.categoryId}>
              <Select id="p-cat" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}><option value="">Choose…</option>{cats.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            </Field>
            <Field label="Fit type" htmlFor="p-fit"><Select id="p-fit" value={form.fitType} onChange={(e) => setForm((f) => ({ ...f, fitType: e.target.value }))}>{FIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>
            <Field label="Sizes" htmlFor="p-sizes" hint="Comma separated, smallest first."><Input id="p-sizes" value={form.sizes} onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))} /></Field>
            <div className="flex gap-2 md:col-span-3"><Button type="submit" loading={busy}>Create & add measurements</Button><Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button></div>
          </form>
        </Panel>
      )}
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or brands" className="pl-10" aria-label="Search products" />
      </div>
      {error ? <ErrorState message={error.message} onRetry={reload} /> : loading ? <Skeleton className="h-96" /> : (
        <div className="scrollbar-none overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full min-w-[760px] text-[13.5px]">
            <thead><tr className="border-b border-line bg-canvas/60 text-left text-[11px] tracking-[0.06em] text-muted uppercase"><th className="px-4 py-2.5">Product</th><th className="px-3">Category</th><th className="px-3">Sizes</th><th className="px-3">Garment data</th><th className="px-3">Status</th></tr></thead>
            <tbody>
              {data?.products.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-canvas/40">
                  <td className="px-4 py-3"><Link href={`/admin/products/${p.id}`} className="font-semibold hover:underline">{p.name}</Link><p className="text-[12px] text-muted">{p.brandName}</p></td>
                  <td className="px-3">{p.categoryName}</td>
                  <td className="num px-3">{p.sizeCount}</td>
                  <td className="px-3">{p.measurementCount ? <span className="num">{p.measurementCount} values · {p.verifiedCount} verified</span> : <Badge tone="warning">None</Badge>}</td>
                  <td className="px-3"><span className="flex gap-1.5">{p.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Hidden</Badge>}{p.isDemo && <DemoDataBadge />}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
