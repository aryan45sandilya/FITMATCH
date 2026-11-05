"use client";

import { Check, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BodyDiagram } from "@/components/illustrations/body-diagram";
import { NoProfileCallout } from "@/components/app/recommendation";
import { Badge, Button, ErrorState, Input, LinkButton, PageHeader, Segmented, Skeleton, cn } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { LOWER_KEYS, MEASUREMENT_LABEL, UPPER_KEYS, relativeTime } from "@/lib/labels";
import { useSession } from "@/lib/session";
import type { BodyKey, Category, MeasurementPoint, Profile } from "@/lib/types";
import { CM_PER_IN, formatHeight, formatLength, formatWeight } from "@/lib/units";
import { useApi } from "@/lib/use-api";

export default function MeasurementsPage() {
  const { unit, setUnit } = useSession();
  const toast = useToast();
  const profiles = useApi<{ profiles: Profile[] }>("/profiles");
  const cats = useApi<{ categories: Category[] }>("/categories");
  const points = useApi<{ points: MeasurementPoint[] }>("/measurement-points");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focus, setFocus] = useState<BodyKey | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const list = profiles.data?.profiles ?? [];
  const p = list.find((x) => x.id === activeId) ?? list[0];
  useEffect(() => setConfirmDelete(false), [activeId]);

  const replace = (next: Profile) => profiles.setData((d) => (d ? { profiles: d.profiles.map((x) => (x.id === next.id ? next : x)) } : d));

  async function makePrimary() {
    if (!p) return;
    await api.put(`/profiles/${p.id}`, { makePrimary: true });
    await profiles.reload();
    toast(`${p.name} is now your main profile`);
  }
  async function remove() {
    if (!p) return;
    try {
      await api.del(`/profiles/${p.id}`);
      setActiveId(null);
      await profiles.reload();
      toast("Profile deleted", "info");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't delete", "error");
    }
  }

  if (profiles.error) return <ErrorState message={profiles.error.message} onRetry={profiles.reload} />;

  return (
    <>
      <PageHeader
        eyebrow="My measurements"
        title="Your body, in numbers."
        description="Stored privately in centimetres; shown in whichever unit you prefer. Tap any value to update it."
        actions={
          <>
            <Segmented label="Units" value={unit} onChange={setUnit} options={[{ value: "cm", label: "cm" }, { value: "in", label: "in" }]} />
            {list.length > 0 && list.length < 5 && (
              <LinkButton href="/onboarding?new=1" variant="secondary"><Plus className="size-4" /> New profile</LinkButton>
            )}
          </>
        }
      />

      {profiles.loading ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]"><Skeleton className="h-[520px]" /><Skeleton className="h-[520px]" /></div>
      ) : !p ? (
        <NoProfileCallout />
      ) : (
        <>
          {list.length > 1 && (
            <div className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Measurement profiles">
              {list.map((x) => (
                <button
                  key={x.id}
                  role="tab"
                  aria-selected={x.id === p.id}
                  onClick={() => setActiveId(x.id)}
                  className={cn("flex h-10 shrink-0 items-center gap-2 rounded-sm border px-4 text-[13.5px] font-semibold transition-colors", x.id === p.id ? "border-ink bg-surface" : "border-line text-muted hover:text-ink")}
                >
                  {x.isPrimary && <Star className="size-3.5 fill-accent text-accent" />} {x.name}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <section className="overflow-hidden rounded-md border border-line bg-surface">
              <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{p.name}</h2>
                    {p.isPrimary && <Badge tone="accent">Main profile</Badge>}
                  </div>
                  <p className="mt-1 text-[13px] text-muted">
                    {formatHeight(p.heightCm, unit)} · {formatWeight(p.weightKg, unit)} · <span className="capitalize">{p.fitPreference}</span> fit · {p.measurementMethod === "self" ? "self-measured" : p.measurementMethod} · updated {relativeTime(p.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <LinkButton href={`/onboarding?profile=${p.id}`} size="sm" variant="secondary"><Pencil className="size-3.5" /> Edit all</LinkButton>
                  {!p.isPrimary && <Button size="sm" variant="ghost" onClick={makePrimary}><Star className="size-3.5" /> Make main</Button>}
                  {confirmDelete ? (
                    <span className="flex items-center gap-1">
                      <Button size="sm" variant="danger" onClick={remove}>Delete profile</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    </span>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete profile"><Trash2 className="size-3.5" /></Button>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 md:divide-x md:divide-line">
                {[{ title: "Upper body", keys: UPPER_KEYS }, { title: "Lower body", keys: LOWER_KEYS }].map((g) => (
                  <div key={g.title} className="p-5 sm:p-6">
                    <p className="eyebrow mb-2">{g.title}</p>
                    <ul className="divide-y divide-line">
                      {g.keys.map((k) => (
                        <EditableRow key={k} profile={p} k={k} unit={unit} point={points.data?.points.find((x) => x.key === k)} onSaved={replace} onFocus={() => setFocus(k)} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <aside className="space-y-5">
              <div className="aspect-[340/480] rounded-md border border-line bg-surface">
                <BodyDiagram values={p.measurements} unit={unit} focus={focus} />
              </div>
              <section className="rounded-md border border-line bg-surface p-5">
                <h3 className="mb-3 text-[14px] font-semibold">Category readiness</h3>
                <ul className="space-y-2">
                  {cats.data?.categories.map((c) => {
                    const missing = c.requiredMeasurements.filter((k) => p.measurements[k] === undefined);
                    return (
                      <li key={c.slug} className="flex items-center justify-between gap-3 text-[13px]">
                        <span>{c.name}</span>
                        {missing.length ? (
                          <span className="text-right text-accent">Needs {missing.map((k) => MEASUREMENT_LABEL[k].toLowerCase()).join(", ")}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-success"><Check className="size-3.5" /> Ready</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <Link href="/size-guide" className="mt-4 inline-block text-[12.5px] font-semibold underline-offset-2 hover:underline">How to measure each point</Link>
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  );
}

function EditableRow({ profile, k, unit, point, onSaved, onFocus }: { profile: Profile; k: BodyKey; unit: "cm" | "in"; point?: MeasurementPoint; onSaved: (p: Profile) => void; onFocus: () => void }) {
  const v = profile.measurements[k];
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  function start() {
    setText(v !== undefined ? String(unit === "in" ? Math.round((v / CM_PER_IN) * 4) / 4 : v) : "");
    setError(undefined);
    setEditing(true);
    onFocus();
  }

  async function save(clear = false) {
    const n = parseFloat(text.replace(",", "."));
    const cm = clear || text.trim() === "" ? null : Math.round((unit === "in" ? n * CM_PER_IN : n) * 10) / 10;
    if (cm !== null && (Number.isNaN(cm) || (point && (cm < point.minCm || cm > point.maxCm)))) {
      setError(point ? `Between ${formatLength(point.minCm, unit)} and ${formatLength(point.maxCm, unit)}` : "Enter a number");
      return;
    }
    setBusy(true);
    try {
      const { profile: next } = await api.put<{ profile: Profile }>(`/profiles/${profile.id}`, { measurements: { [k]: cm } });
      onSaved(next);
      setEditing(false);
      toast(`${MEASUREMENT_LABEL[k]} ${cm === null ? "removed" : "updated"}`);
    } catch (err) {
      setError(err instanceof ApiError ? Object.values(err.details ?? {})[0] ?? err.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="py-2.5" onMouseEnter={onFocus}>
      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="flex items-center gap-2">
          <label htmlFor={`edit-${k}`} className="flex-1 text-[14px]">{MEASUREMENT_LABEL[k]}</label>
          <Input id={`edit-${k}`} autoFocus inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} suffix={unit} className="h-9 w-28" invalid={Boolean(error)} onKeyDown={(e) => e.key === "Escape" && setEditing(false)} />
          <Button type="submit" size="sm" loading={busy} aria-label="Save"><Check className="size-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} aria-label="Cancel"><X className="size-3.5" /></Button>
        </form>
      ) : (
        <button type="button" onClick={start} className="group flex w-full items-center justify-between text-left">
          <span className="text-[14px]">{MEASUREMENT_LABEL[k]}</span>
          <span className="flex items-center gap-2">
            <span className={cn("num text-[14px]", v === undefined ? "text-accent" : "font-semibold")}>{v === undefined ? "Add" : formatLength(v, unit)}</span>
            <Pencil className="size-3.5 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
        </button>
      )}
      {error && <p className="mt-1 text-right text-[12px] text-danger" role="alert">{error}</p>}
    </li>
  );
}
