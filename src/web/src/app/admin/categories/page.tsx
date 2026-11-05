"use client";

import { useEffect, useState } from "react";
import { Button, ErrorState, Notice, PageHeader, Skeleton, cn } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { ALL_BODY_KEYS, MEASUREMENT_LABEL } from "@/lib/labels";
import type { BodyKey, Category } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export default function CategoriesAdmin() {
  const { data, error, loading, reload } = useApi<{ categories: Category[] }>("/admin/categories");
  const [drafts, setDrafts] = useState<Record<number, Category>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [msg, setMsg] = useState<string>();
  const toast = useToast();

  useEffect(() => {
    if (data) setDrafts(Object.fromEntries(data.categories.map((c) => [c.id, c])));
  }, [data]);

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (loading || !data) return <Skeleton className="h-96" />;

  const update = (id: number, patch: Partial<Category>) => setDrafts((d) => ({ ...d, [id]: { ...d[id]!, ...patch } }));

  async function save(id: number) {
    const c = drafts[id]!;
    setSaving(id);
    setMsg(undefined);
    try {
      await api.patch(`/admin/categories/${id}`, { name: c.name, requiredMeasurements: c.requiredMeasurements, weights: Object.fromEntries(Object.entries(c.weights).filter(([, w]) => (w ?? 0) > 0)) });
      toast(`${c.name} updated`);
      await reload();
    } catch (err) {
      setMsg(err instanceof ApiError ? `${err.message} ${Object.values(err.details ?? {}).join(" ")}` : "Couldn't save");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Clothing categories" description="Required measurements gate recommendations; weights decide how much each measurement counts in the engine's weighted distance." />
      {msg && <Notice tone="danger" className="mb-4">{msg}</Notice>}
      <div className="space-y-4">
        {data.categories.map((orig) => {
          const c = drafts[orig.id] ?? orig;
          const total = Object.values(c.weights).reduce<number>((s, w) => s + (w ?? 0), 0);
          return (
            <section key={c.id} className="rounded-md border border-line bg-surface p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[16px] font-semibold">{c.name} <span className="text-[12px] font-normal text-muted">· {c.garmentGroup}</span></h2>
                <span className="flex items-center gap-3">
                  <span className={cn("num text-[12.5px]", Math.abs(total - 1) > 0.01 ? "text-warning-text" : "text-muted")}>Σ weights {total.toFixed(2)}</span>
                  <Button size="sm" onClick={() => save(c.id)} loading={saving === c.id}>Save</Button>
                </span>
              </div>
              <div className="scrollbar-none overflow-x-auto">
                <table className="w-full min-w-[720px] text-[12.5px]">
                  <thead><tr className="text-left text-muted"><th className="py-1 pr-2 font-medium">Measurement</th>{ALL_BODY_KEYS.map((k) => <th key={k} className="px-1.5 py-1 font-medium whitespace-nowrap">{MEASUREMENT_LABEL[k].replace(" length", "").replace(" width", "")}</th>)}</tr></thead>
                  <tbody>
                    <tr>
                      <th className="py-1.5 pr-2 text-left font-medium">Required</th>
                      {ALL_BODY_KEYS.map((k) => (
                        <td key={k} className="px-1.5 py-1.5">
                          <input type="checkbox" aria-label={`${MEASUREMENT_LABEL[k]} required for ${c.name}`} checked={c.requiredMeasurements.includes(k)} className="size-4 accent-ink"
                            onChange={(e) => update(c.id, { requiredMeasurements: e.target.checked ? [...c.requiredMeasurements, k] : c.requiredMeasurements.filter((x) => x !== k) })} />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th className="py-1.5 pr-2 text-left font-medium">Weight</th>
                      {ALL_BODY_KEYS.map((k: BodyKey) => (
                        <td key={k} className="px-1.5 py-1.5">
                          <input aria-label={`${MEASUREMENT_LABEL[k]} weight for ${c.name}`} inputMode="decimal" value={c.weights[k] ?? ""} placeholder="0"
                            onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, "").slice(0, 4); update(c.id, { weights: { ...c.weights, [k]: v === "" ? 0 : Number(v) } }); }}
                            className="num h-8 w-14 rounded-xs border border-line-strong px-1.5 focus:border-ink focus:outline-none" />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
