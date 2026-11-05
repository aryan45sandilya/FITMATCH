"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Checkbox, ErrorState, Field, Input, Notice, PageHeader, Panel, Skeleton, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";

interface AdminBrand {
  id: string; slug: string; name: string; country: string | null; websiteUrl: string | null; description: string | null;
  sizingNotes: string | null; logoUrl: string | null; isActive: boolean; productCount: number; chartCount: number;
}
const blank = { slug: "", name: "", country: "", websiteUrl: "", description: "", sizingNotes: "", logoUrl: "", isActive: true };

export default function AdminBrands() {
  const { data, error, loading, reload } = useApi<{ brands: AdminBrand[] }>("/admin/brands");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(blank);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const open = (b?: AdminBrand) => {
    setErrs({});
    setMsg(undefined);
    setEditing(b?.id ?? "new");
    setForm(b ? { slug: b.slug, name: b.name, country: b.country ?? "", websiteUrl: b.websiteUrl ?? "", description: b.description ?? "", sizingNotes: b.sizingNotes ?? "", logoUrl: b.logoUrl ?? "", isActive: b.isActive } : blank);
  };
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrs({});
    const body = { ...form, country: form.country || null, websiteUrl: form.websiteUrl || null, description: form.description || null, sizingNotes: form.sizingNotes || null, logoUrl: form.logoUrl || null };
    try {
      if (editing === "new") await api.post("/admin/brands", body);
      else await api.patch(`/admin/brands/${editing}`, body);
      toast(editing === "new" ? "Brand created" : "Brand updated");
      setEditing(null);
      await reload();
    } catch (err) {
      if (err instanceof ApiError) { setErrs(err.details ?? {}); setMsg(err.message); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Brands" actions={<Button onClick={() => open()}><Plus className="size-4" /> Add brand</Button>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          {error ? <div className="p-5"><ErrorState message={error.message} onRetry={reload} /></div> : loading ? <Skeleton className="m-5 h-64" /> : (
            <table className="w-full text-[13.5px]">
              <thead><tr className="border-b border-line bg-canvas/60 text-left text-[11px] tracking-[0.06em] text-muted uppercase"><th className="px-4 py-2.5">Brand</th><th className="px-3">Products</th><th className="px-3">Charts</th><th className="px-3">Status</th><th /></tr></thead>
              <tbody>
                {data?.brands.map((b) => (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3"><p className="font-semibold">{b.name}</p><p className="text-[12px] text-muted">{b.slug} · {b.country}</p></td>
                    <td className="num px-3">{b.productCount}</td>
                    <td className="num px-3">{b.chartCount}</td>
                    <td className="px-3">{b.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Hidden</Badge>}</td>
                    <td className="px-3 text-right"><Button size="sm" variant="ghost" onClick={() => open(b)} aria-label={`Edit ${b.name}`}><Pencil className="size-3.5" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {editing && (
          <Panel title={editing === "new" ? "New brand" : "Edit brand"} className="self-start lg:sticky lg:top-20">
            <form onSubmit={save} className="space-y-4">
              {msg && <Notice tone="danger">{msg}</Notice>}
              <Field label="Name" htmlFor="b-name" error={errs.name}><Input id="b-name" value={form.name} onChange={set("name")} /></Field>
              <Field label="Slug" htmlFor="b-slug" error={errs.slug} hint="Lowercase, used in URLs."><Input id="b-slug" value={form.slug} onChange={set("slug")} /></Field>
              <Field label="Country" htmlFor="b-country" optional><Input id="b-country" value={form.country} onChange={set("country")} /></Field>
              <Field label="Website" htmlFor="b-web" optional error={errs.websiteUrl}><Input id="b-web" value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://" /></Field>
              <Field label="Logo URL" htmlFor="b-logo" optional error={errs.logoUrl}><Input id="b-logo" value={form.logoUrl} onChange={set("logoUrl")} placeholder="https://" /></Field>
              <Field label="Description" htmlFor="b-desc" optional><Textarea id="b-desc" value={form.description} onChange={set("description")} /></Field>
              <Field label="Sizing notes" htmlFor="b-notes" optional hint="Shown to users on the brand page."><Textarea id="b-notes" value={form.sizingNotes} onChange={set("sizingNotes")} /></Field>
              <Checkbox checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="Visible to users" />
              <div className="flex gap-2"><Button type="submit" loading={busy}>Save</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
            </form>
          </Panel>
        )}
      </div>
    </>
  );
}
