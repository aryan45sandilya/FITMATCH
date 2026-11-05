"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, HelpCircle, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { FIT_OPTIONS, LOWER_KEYS, MEASUREMENT_LABEL, UPPER_KEYS } from "@/lib/labels";
import { useSession } from "@/lib/session";
import type { BodyKey, Category, Fit, MeasurementPoint, Profile, Unit } from "@/lib/types";
import { CM_PER_IN, KG_PER_LB, formatHeight, formatLength, formatWeight } from "@/lib/units";
import { useApi } from "@/lib/use-api";
import { Logo } from "../brand";
import { BodyDiagram } from "../illustrations/body-diagram";
import { Badge, Button, Field, Input, Notice, Segmented, Select, Skeleton, cn } from "../ui/primitives";
import { useToast } from "../ui/toast";

const STEPS = ["Basics", "Upper body", "Lower body", "Fit", "Summary"] as const;
const DRAFT_KEY = "fm_onboarding_draft_v1";

interface Draft {
  name: string;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  method: Profile["measurementMethod"];
  measurements: Partial<Record<BodyKey, number>>;
  fit: Fit;
  categoryFits: Record<string, Fit>;
}

const emptyDraft: Draft = { name: "My profile", method: "self", measurements: {}, fit: "regular", categoryFits: {} };

const round = (n: number, unit: Unit) => (unit === "in" ? Math.round((n / CM_PER_IN) * 4) / 4 : Math.round(n * 10) / 10);

function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function writeDraft(d: Draft | null) {
  try {
    if (d) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Plausibility checks — catches typos and unit mix-ups before they skew results. */
function consistencyWarnings(d: Draft): string[] {
  const m = d.measurements;
  const out: string[] = [];
  if (m.chest && m.waist && m.waist > m.chest + 30) out.push("Your waist is much larger than your chest — double-check both, measured around the body.");
  if (m.hip && m.waist && m.hip < m.waist - 20) out.push("Hips are well below waist. Make sure the hip measurement is around the fullest part of the seat.");
  if (m.shoulder && m.chest && (m.shoulder < m.chest * 0.33 || m.shoulder > m.chest * 0.6)) out.push("Shoulder width looks unusual for your chest. Shoulder is measured straight across the back, not around.");
  if (m.inseam && d.heightCm && m.inseam > d.heightCm * 0.56) out.push("Your inseam is long for your height — check it's crotch-to-ankle, not waist-to-floor (that's the outseam).");
  if (m.inseam && m.outseam && m.outseam <= m.inseam) out.push("Outseam should be longer than inseam: it starts at the waist.");
  if (m.neck && m.chest && m.neck > m.chest * 0.55) out.push("Neck looks large relative to chest — measure around the base of the neck only.");
  return out;
}

export function MeasurementWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { user, unit, setUnit } = useSession();
  const editId = params.get("profile");
  const isNew = params.get("new") === "1";

  const points = useApi<{ points: MeasurementPoint[] }>("/measurement-points");
  const cats = useApi<{ categories: Category[] }>("/categories");
  const existing = useApi<{ profile: Profile }>(editId ? `/profiles/${editId}` : null);

  const [step, setStep] = useState(Number(params.get("step") ?? 0) || 0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [focus, setFocus] = useState<BodyKey | null>("chest");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const loaded = useRef(false);

  // Hydrate from an existing profile, or a saved draft, or defaults.
  useEffect(() => {
    if (loaded.current) return;
    if (editId) {
      if (!existing.data) return;
      const p = existing.data.profile;
      setDraft({
        name: p.name,
        heightCm: p.heightCm ?? undefined,
        weightKg: p.weightKg ?? undefined,
        age: p.age ?? undefined,
        method: p.measurementMethod,
        measurements: p.measurements,
        fit: p.fitPreference,
        categoryFits: p.categoryFits,
      });
    } else {
      const saved = !isNew ? readDraft() : null;
      if (saved) setDraft(saved);
      else if (isNew) setDraft({ ...emptyDraft, name: "" });
    }
    loaded.current = true;
  }, [editId, existing.data, isNew]);

  useEffect(() => {
    if (loaded.current && !editId) writeDraft(draft);
  }, [draft, editId]);

  const pointMap = useMemo(() => new Map((points.data?.points ?? []).map((p) => [p.key, p])), [points.data]);
  const categories = cats.data?.categories ?? [];
  const neededFor = (k: BodyKey) => categories.filter((c) => c.requiredMeasurements.includes(k)).map((c) => c.name);

  const setMeasurement = (k: BodyKey, cm: number | undefined) =>
    setDraft((d) => {
      const m = { ...d.measurements };
      if (cm === undefined) delete m[k];
      else m[k] = cm;
      return { ...d, measurements: m };
    });

  function validateKeys(keys: BodyKey[]) {
    const e: Record<string, string> = {};
    for (const k of keys) {
      const v = draft.measurements[k];
      const p = pointMap.get(k);
      if (v !== undefined && p && (v < p.minCm || v > p.maxCm)) {
        e[k] = `Expected between ${formatLength(p.minCm, unit)} and ${formatLength(p.maxCm, unit)}.`;
      }
    }
    if (step === 0) {
      if (draft.heightCm !== undefined && (draft.heightCm < 100 || draft.heightCm > 250)) e.height = `Height should be between ${formatHeight(100, unit)} and ${formatHeight(250, unit)}.`;
      if (draft.weightKg !== undefined && (draft.weightKg < 25 || draft.weightKg > 300)) e.weight = "That weight looks out of range.";
      if (draft.age !== undefined && (draft.age < 13 || draft.age > 120)) e.age = "Age must be between 13 and 120.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const stepKeys = step === 1 ? UPPER_KEYS : step === 2 ? LOWER_KEYS : [];
  const go = (to: number) => {
    if (to > step && !validateKeys(stepKeys)) return;
    setErrors({});
    setStep(to);
    setFocus(to === 1 ? "chest" : to === 2 ? "waist" : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function save() {
    setSaving(true);
    setError(undefined);
    const body = {
      name: draft.name.trim() || "My profile",
      heightCm: draft.heightCm ?? null,
      weightKg: draft.weightKg ?? null,
      age: draft.age ?? null,
      measurementMethod: draft.method,
      measurements: Object.fromEntries(
        [...UPPER_KEYS, ...LOWER_KEYS].map((k) => [k, draft.measurements[k] ?? null]),
      ),
      fitPreference: draft.fit,
      categoryFits: Object.fromEntries(categories.map((c) => [c.slug, draft.categoryFits[c.slug] ?? null])),
    };
    try {
      if (editId) await api.put(`/profiles/${editId}`, body);
      else await api.post("/profiles", { ...body, measurements: Object.fromEntries(Object.entries(body.measurements).filter(([, v]) => v !== null)), categoryFits: draft.categoryFits });
      writeDraft(null);
      toast(editId ? "Measurements updated" : "Profile saved — let's find your size");
      router.push(editId || isNew ? "/app/measurements" : "/app/find?welcome=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your profile.");
      if (err instanceof ApiError && err.details) setErrors(Object.fromEntries(Object.entries(err.details).map(([k, v]) => [k.replace("measurements.", ""), v])));
      setSaving(false);
    }
  }

  const loading = points.loading || cats.loading || (editId && existing.loading);
  const warnings = consistencyWarnings(draft);

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Top bar with progress */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href={user ? "/app" : "/"} />
          <div className="hidden items-center gap-1 md:flex" aria-hidden>
            {STEPS.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => i < step && go(i)}
                disabled={i >= step}
                className={cn("flex items-center gap-2 rounded-xs px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors", i === step ? "text-ink" : i < step ? "text-muted hover:text-ink" : "text-faint")}
              >
                <span className={cn("num grid size-5 place-items-center rounded-full text-[10.5px]", i < step ? "bg-ink text-canvas" : i === step ? "border border-ink" : "border border-line-strong")}>
                  {i < step ? <Check className="size-3" /> : i + 1}
                </span>
                {s}
              </button>
            ))}
          </div>
          <Link href={user ? (editId ? "/app/measurements" : "/app") : "/"} className="grid size-10 place-items-center rounded-sm text-muted hover:text-ink" aria-label="Exit measurement setup">
            <X className="size-5" />
          </Link>
        </div>
        <div className="h-0.5 bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
          <motion.div className="h-full bg-accent" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 pt-8 pb-36 sm:px-6 md:pt-12 lg:grid-cols-[1fr_420px] lg:gap-16 lg:pb-24">
        <div className="min-w-0">
          <p className="eyebrow mb-3 md:hidden">Step {step + 1} of {STEPS.length}</p>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-9 w-72" />
              <Skeleton className="h-5 w-full max-w-md" />
              <Skeleton className="mt-8 h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                {step === 0 && <BasicsStep draft={draft} setDraft={setDraft} unit={unit} setUnit={setUnit} errors={errors} />}
                {(step === 1 || step === 2) && (
                  <MeasureStep
                    title={step === 1 ? "Upper body" : "Lower body"}
                    lede={step === 1 ? "These shape how tops, shirts and jackets fit. Skip anything you don't shop for." : "These drive jeans, trousers and shorts. Measure over light clothing or none."}
                    keys={stepKeys}
                    draft={draft}
                    unit={unit}
                    setUnit={setUnit}
                    pointMap={pointMap}
                    neededFor={neededFor}
                    errors={errors}
                    focus={focus}
                    setFocus={setFocus}
                    setMeasurement={setMeasurement}
                  />
                )}
                {step === 3 && <FitStep draft={draft} setDraft={setDraft} categories={categories} />}
                {step === 4 && (
                  <SummaryStep draft={draft} setDraft={setDraft} unit={unit} setUnit={setUnit} categories={categories} warnings={warnings} onEdit={(s, k) => { setStep(s); setFocus(k ?? null); }} isEdit={Boolean(editId)} />
                )}
              </motion.div>
            </AnimatePresence>
          )}
          {error && <Notice tone="danger" className="mt-6">{error}</Notice>}

          {/* Desktop actions */}
          <div className="mt-10 hidden items-center justify-between border-t border-line pt-6 lg:flex">
            <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => go(step + 1)} size="lg">
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={save} size="lg" loading={saving}>
                {editId ? "Save changes" : "Save profile"} <Check className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Live diagram */}
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-4">
            <div className="aspect-[340/480] rounded-md border border-line bg-surface">
              <BodyDiagram focus={focus} values={draft.measurements} unit={unit} />
            </div>
            {focus && pointMap.get(focus) && (step === 1 || step === 2) && (
              <div className="rounded-md bg-night p-5 text-paper">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">How to measure · {MEASUREMENT_LABEL[focus]}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-[#d4d1ca]">{pointMap.get(focus)!.howToMeasure}</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile sticky actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl gap-2.5">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => go(step - 1)} aria-label="Back" className="px-4">
              <ArrowLeft className="size-4" />
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button size="lg" full onClick={() => go(step + 1)}>
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button size="lg" full onClick={save} loading={saving}>
              {editId ? "Save changes" : "Save profile"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeading({ title, lede, aside }: { title: string; lede: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-[32px] leading-[1.1] tracking-[-0.02em] sm:text-[40px]">{title}</h1>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-muted">{lede}</p>
      </div>
      {aside}
    </div>
  );
}

function UnitToggle({ unit, setUnit }: { unit: Unit; setUnit: (u: Unit) => void }) {
  return <Segmented label="Measurement unit" value={unit} onChange={setUnit} options={[{ value: "cm", label: "cm / kg" }, { value: "in", label: "in / lb" }]} />;
}

function NumberField({
  id, valueCm, onChange, unit, invalid, placeholder, scale = "length",
}: { id: string; valueCm?: number; onChange: (cm: number | undefined) => void; unit: Unit; invalid?: boolean; placeholder?: string; scale?: "length" | "weight" }) {
  const toDisplay = (cm: number) => (scale === "weight" ? (unit === "in" ? Math.round(cm / KG_PER_LB) : Math.round(cm * 10) / 10) : round(cm, unit));
  const fromDisplay = (v: number) => (scale === "weight" ? (unit === "in" ? v * KG_PER_LB : v) : unit === "in" ? v * CM_PER_IN : v);
  const [text, setText] = useState(valueCm !== undefined ? String(toDisplay(valueCm)) : "");
  const lastUnit = useRef(unit);
  useEffect(() => {
    if (lastUnit.current !== unit || (valueCm === undefined && text !== "")) {
      setText(valueCm !== undefined ? String(toDisplay(valueCm)) : "");
      lastUnit.current = unit;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, valueCm]);
  return (
    <Input
      id={id}
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      invalid={invalid}
      suffix={scale === "weight" ? (unit === "in" ? "lb" : "kg") : unit}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        if (!/^\d{0,3}(\.\d{0,2})?$/.test(raw)) return;
        setText(raw);
        const n = parseFloat(raw);
        onChange(raw === "" || Number.isNaN(n) ? undefined : Math.round(fromDisplay(n) * 10) / 10);
      }}
    />
  );
}

function BasicsStep({ draft, setDraft, unit, setUnit, errors }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; unit: Unit; setUnit: (u: Unit) => void; errors: Record<string, string> }) {
  const ft = draft.heightCm ? Math.floor(draft.heightCm / CM_PER_IN / 12) : undefined;
  const inch = draft.heightCm && ft !== undefined ? Math.round(draft.heightCm / CM_PER_IN - ft * 12) : undefined;
  const setImperial = (f?: number, i?: number) => {
    if (f === undefined && i === undefined) return setDraft((d) => ({ ...d, heightCm: undefined }));
    setDraft((d) => ({ ...d, heightCm: Math.round(((f ?? 0) * 12 + (i ?? 0)) * CM_PER_IN * 10) / 10 }));
  };
  return (
    <>
      <StepHeading title="Let's start with the basics." lede="Height helps us check garment lengths. Weight and age are optional." aside={<UnitToggle unit={unit} setUnit={setUnit} />} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Profile name" htmlFor="pname" hint="e.g. “Me”, or a name for someone you shop for." className="sm:col-span-2">
          <Input id="pname" value={draft.name} maxLength={60} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="My profile" />
        </Field>
        <Field label="Height" htmlFor="height" error={errors.height}>
          {unit === "cm" ? (
            <NumberField id="height" unit="cm" valueCm={draft.heightCm} onChange={(v) => setDraft((d) => ({ ...d, heightCm: v }))} invalid={Boolean(errors.height)} placeholder="178" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Input id="height" inputMode="numeric" suffix="ft" value={ft ?? ""} onChange={(e) => setImperial(e.target.value ? Number(e.target.value.replace(/\D/g, "").slice(0, 1)) : undefined, inch)} placeholder="5" aria-label="Height feet" />
              <Input inputMode="numeric" suffix="in" value={inch ?? ""} onChange={(e) => setImperial(ft, e.target.value ? Math.min(11, Number(e.target.value.replace(/\D/g, "").slice(0, 2))) : undefined)} placeholder="10" aria-label="Height inches" />
            </div>
          )}
        </Field>
        <Field label="Weight" htmlFor="weight" optional error={errors.weight}>
          <NumberField id="weight" scale="weight" unit={unit} valueCm={draft.weightKg} onChange={(v) => setDraft((d) => ({ ...d, weightKg: v }))} placeholder={unit === "in" ? "165" : "75"} />
        </Field>
        <Field label="Age" htmlFor="age" optional error={errors.age}>
          <Input id="age" inputMode="numeric" value={draft.age ?? ""} onChange={(e) => setDraft((d) => ({ ...d, age: e.target.value ? Number(e.target.value.replace(/\D/g, "").slice(0, 3)) : undefined }))} placeholder="30" />
        </Field>
        <Field label="Who is measuring?" htmlFor="method" hint="Measurements taken by someone else are usually more accurate.">
          <Select id="method" value={draft.method} onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value as Draft["method"] }))}>
            <option value="self">I&apos;m measuring myself</option>
            <option value="assisted">Someone is helping me</option>
            <option value="professional">Taken by a tailor</option>
            <option value="estimated">Rough estimates for now</option>
          </Select>
        </Field>
      </div>
      <Notice tone="muted" className="mt-8" icon={<HelpCircle className="size-4" />}>
        You&apos;ll need a soft tape measure for the next two steps. Every measurement is optional — we&apos;ll tell you which ones each category needs.
      </Notice>
    </>
  );
}

function MeasureStep({
  title, lede, keys, draft, unit, setUnit, pointMap, neededFor, errors, focus, setFocus, setMeasurement,
}: {
  title: string; lede: string; keys: BodyKey[]; draft: Draft; unit: Unit; setUnit: (u: Unit) => void;
  pointMap: Map<string, MeasurementPoint>; neededFor: (k: BodyKey) => string[]; errors: Record<string, string>;
  focus: BodyKey | null; setFocus: (k: BodyKey) => void; setMeasurement: (k: BodyKey, cm: number | undefined) => void;
}) {
  const [openHelp, setOpenHelp] = useState<BodyKey | null>(null);
  const filled = keys.filter((k) => draft.measurements[k] !== undefined).length;
  return (
    <>
      <StepHeading title={title} lede={lede} aside={<UnitToggle unit={unit} setUnit={setUnit} />} />
      <p className="mb-4 text-[13px] text-muted">
        <span className="num font-semibold text-ink">{filled}</span> of {keys.length} added
      </p>
      <ul className="divide-y divide-line rounded-md border border-line bg-surface">
        {keys.map((k) => {
          const p = pointMap.get(k);
          const needed = neededFor(k);
          const missingRequired = needed.length > 0 && draft.measurements[k] === undefined;
          const open = openHelp === k;
          return (
            <li key={k} className={cn("p-4 transition-colors sm:p-5", focus === k && "bg-focus-row")} onFocusCapture={() => setFocus(k)} onMouseEnter={() => setFocus(k)}>
              <div className="grid gap-3 sm:grid-cols-[1fr_200px] sm:items-start sm:gap-6">
                <div className="min-w-0">
                  <label htmlFor={`m-${k}`} className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                    {MEASUREMENT_LABEL[k]}
                    {needed.length > 0 && (
                      <Badge tone={missingRequired ? "accent" : "muted"} className="font-medium">
                        Needed for {needed.slice(0, 2).join(", ")}{needed.length > 2 ? ` +${needed.length - 2}` : ""}
                      </Badge>
                    )}
                  </label>
                  <p className="mt-1 text-[13px] text-muted">{p?.description}</p>
                  <button type="button" onClick={() => setOpenHelp(open ? null : k)} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink/80 hover:text-ink lg:hidden" aria-expanded={open}>
                    How to measure <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
                  </button>
                </div>
                <div>
                  <NumberField id={`m-${k}`} unit={unit} valueCm={draft.measurements[k]} onChange={(v) => setMeasurement(k, v)} invalid={Boolean(errors[k])} placeholder="—" />
                  {errors[k] && <p className="mt-1.5 text-[12px] text-danger" role="alert">{errors[k]}</p>}
                </div>
              </div>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden lg:hidden">
                    <div className="mt-4 grid grid-cols-[96px_1fr] gap-4 rounded-sm bg-canvas p-3">
                      <div className="aspect-[340/480]"><BodyDiagram compact focus={k} visible={[k]} /></div>
                      <p className="text-[13.5px] leading-relaxed text-ink/85">{p?.howToMeasure}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </>
  );
}

const fitWidths: Record<Fit, number> = { slim: 6, regular: 12, relaxed: 18, oversized: 26 };

function FitStep({ draft, setDraft, categories }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; categories: Category[] }) {
  const [fine, setFine] = useState(Object.keys(draft.categoryFits).length > 0);
  return (
    <>
      <StepHeading title="How do you like things to fit?" lede="We aim for this fit when choosing between sizes. You can change it per product later." />
      <div role="radiogroup" aria-label="Fit preference" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {FIT_OPTIONS.map((o) => {
          const on = draft.fit === o.value;
          const w = fitWidths[o.value];
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setDraft((d) => ({ ...d, fit: o.value }))}
              className={cn("group flex flex-col rounded-md border bg-surface p-4 text-left transition-all", on ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-strong")}
            >
              <svg viewBox="0 0 100 90" className="mb-4 h-20 w-full" aria-hidden>
                <path d="M38 14 Q50 22 62 14 L70 20 L68 82 L32 82 L30 20 Z" fill="#EFEBE4" stroke="#B9B3A8" strokeWidth="0.8" />
                <path
                  d={`M${38 - w / 2} 12 Q50 ${22 - w / 6} ${62 + w / 2} 12 L${72 + w} ${22 + w / 4} L${66 + w / 1.5} 30 L${66 + w / 2.5} 26 L${66 + w / 2.5} 84 L${34 - w / 2.5} 84 L${34 - w / 2.5} 26 L${34 - w / 1.5} 30 L${28 - w} ${22 + w / 4} Z`}
                  fill={on ? "#171717" : "#D6D2CA"}
                  fillOpacity={on ? 0.9 : 0.55}
                  className="transition-all duration-300"
                />
              </svg>
              <span className="flex items-center justify-between text-[15px] font-semibold">
                {o.label}
                {on && <Check className="size-4" />}
              </span>
              <span className="mt-1 text-[12.5px] leading-snug text-muted">{o.description}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 rounded-md border border-line bg-surface">
        <button type="button" onClick={() => setFine((f) => !f)} className="flex w-full items-center justify-between px-5 py-4 text-left" aria-expanded={fine}>
          <span>
            <span className="block text-[14.5px] font-semibold">Fine-tune by category</span>
            <span className="text-[13px] text-muted">E.g. slim jeans but relaxed hoodies.</span>
          </span>
          <ChevronDown className={cn("size-4 text-muted transition-transform", fine && "rotate-180")} />
        </button>
        {fine && (
          <ul className="divide-y divide-line border-t border-line">
            {categories.map((c) => (
              <li key={c.slug} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="text-[14px] font-medium">{c.name}</span>
                <Select
                  aria-label={`${c.name} fit`}
                  className="h-9 w-40 text-[13px]"
                  value={draft.categoryFits[c.slug] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => {
                      const next = { ...d.categoryFits };
                      if (e.target.value) next[c.slug] = e.target.value as Fit;
                      else delete next[c.slug];
                      return { ...d, categoryFits: next };
                    })
                  }
                >
                  <option value="">Use default</option>
                  {FIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function SummaryStep({
  draft, setDraft, unit, setUnit, categories, warnings, onEdit, isEdit,
}: {
  draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; unit: Unit; setUnit: (u: Unit) => void; categories: Category[];
  warnings: string[]; onEdit: (step: number, key?: BodyKey) => void; isEdit: boolean;
}) {
  const ready = categories.map((c) => ({ c, missing: c.requiredMeasurements.filter((k) => draft.measurements[k] === undefined) }));
  return (
    <>
      <StepHeading title={isEdit ? "Review your changes." : "Your measurement profile."} lede="Check everything looks right. You can edit any value — now or later." aside={<Segmented label="Units" value={unit} onChange={setUnit} options={[{ value: "cm", label: "cm" }, { value: "in", label: "in" }]} />} />

      {warnings.length > 0 && (
        <Notice tone="warning" icon={<AlertTriangle className="size-4" />} className="mb-6">
          <p className="font-semibold">Measurement check</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </Notice>
      )}

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="flex flex-col gap-4 bg-night p-5 text-paper sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <label htmlFor="sum-name" className="text-[11px] font-semibold tracking-[0.16em] text-[#8a877f] uppercase">Profile</label>
            <input id="sum-name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="My profile" maxLength={60}
              className="mt-0.5 block w-full bg-transparent text-[22px] font-semibold tracking-[-0.02em] text-paper outline-none placeholder:text-[#8c897f]" />
          </div>
          <dl className="flex gap-6 text-[13px]">
            <div><dt className="text-[#8a877f]">Height</dt><dd className="num font-semibold">{formatHeight(draft.heightCm, unit)}</dd></div>
            <div><dt className="text-[#8a877f]">Weight</dt><dd className="num font-semibold">{formatWeight(draft.weightKg, unit)}</dd></div>
            <div><dt className="text-[#8a877f]">Fit</dt><dd className="font-semibold capitalize">{draft.fit}</dd></div>
          </dl>
        </div>
        <div className="grid md:grid-cols-2 md:divide-x md:divide-line">
          {[{ title: "Upper body", keys: UPPER_KEYS, step: 1 }, { title: "Lower body", keys: LOWER_KEYS, step: 2 }].map((g) => (
            <div key={g.title} className="p-5">
              <p className="eyebrow mb-3">{g.title}</p>
              <ul className="divide-y divide-line">
                {g.keys.map((k) => {
                  const v = draft.measurements[k];
                  return (
                    <li key={k} className="flex items-center justify-between py-2.5">
                      <span className="text-[14px]">{MEASUREMENT_LABEL[k]}</span>
                      <span className="flex items-center gap-2">
                        <span className={cn("num text-[14px]", v === undefined ? "text-faint" : "font-semibold")}>{v === undefined ? "Not added" : formatLength(v, unit)}</span>
                        <button type="button" onClick={() => onEdit(g.step, k)} className="grid size-8 place-items-center rounded-sm text-muted hover:bg-canvas hover:text-ink" aria-label={`Edit ${MEASUREMENT_LABEL[k]}`}>
                          <Pencil className="size-3.5" />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <h2 className="mt-10 mb-3 text-[15px] font-semibold">What you can size right now</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {ready.map(({ c, missing }) => (
          <li key={c.slug} className={cn("flex items-start justify-between gap-3 rounded-sm border px-3.5 py-3 text-[13.5px]", missing.length ? "border-line bg-surface" : "border-success/20 bg-success-soft/50")}>
            <span className="font-medium">{c.name}</span>
            {missing.length ? (
              <button type="button" onClick={() => onEdit(UPPER_KEYS.includes(missing[0]!) ? 1 : 2, missing[0])} className="text-right text-[12.5px] text-accent hover:underline">
                Add {missing.map((k) => MEASUREMENT_LABEL[k].toLowerCase()).join(", ")}
              </button>
            ) : (
              <span className="flex items-center gap-1 text-[12.5px] text-success"><Check className="size-3.5" /> Ready</span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
