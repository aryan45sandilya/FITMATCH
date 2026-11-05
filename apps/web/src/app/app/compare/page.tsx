"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Info } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { DemoDataBadge } from "@/components/brand";
import { Chip } from "@/components/app/brand-views";
import { NoProfileCallout } from "@/components/app/recommendation";
import { Badge, ErrorState, Field, Notice, PageHeader, Segmented, Select, Skeleton, cn } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import { CONFIDENCE, MEASUREMENT_LABEL, POINT_STATUS, QUALITY } from "@/lib/labels";
import { useSession } from "@/lib/session";
import type { Brand, Category, ChartData, EngineResult, Profile, Unit } from "@/lib/types";
import { formatLength, formatRange } from "@/lib/units";
import { useApi } from "@/lib/use-api";

interface Row {
  brand: { id: string; slug: string; name: string };
  chart: { id: string; name: string; verification: string; isDemo: boolean } | null;
  productCount: number;
  productsWithGarmentData: number;
  result: EngineResult;
}
interface CompareResponse { rows: Row[]; referenceNote: string | null; fitPreference: string; category: { name: string } }

type Sort = "fit" | "brand";
const rank = (r: EngineResult) => (r.status === "ok" ? QUALITY[r.matchQuality].level * 10 + CONFIDENCE[r.confidence].level : r.status === "missing_measurements" ? -1 : -2);

export default function ComparePage() {
  return (
    <Suspense>
      <Compare />
    </Suspense>
  );
}

function Compare() {
  const params = useSearchParams();
  const router = useRouter();
  const { unit } = useSession();
  const cats = useApi<{ categories: Category[] }>("/categories");
  const brands = useApi<{ brands: Brand[] }>("/brands");
  const profiles = useApi<{ profiles: Profile[] }>("/profiles");

  const category = params.get("category") ?? "t-shirts";
  const [mode, setMode] = useState<"profile" | "reference">("profile");
  const [refBrand, setRefBrand] = useState("hm");
  const [refSize, setRefSize] = useState("M");
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("fit");
  const [data, setData] = useState<CompareResponse>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const refChart = useApi<{ charts: (ChartData & { categorySlug: string })[] }>(mode === "reference" ? `/brands/${refBrand}` : null);
  const refSizes = refChart.data?.charts.find((c) => c.categorySlug === category)?.sizes.map((s) => s.label) ?? [];
  useEffect(() => {
    if (refSizes.length && !refSizes.includes(refSize)) setRefSize(refSizes[Math.floor(refSizes.length / 2)]!);
  }, [refSizes, refSize]);

  const hasProfile = (profiles.data?.profiles.length ?? 0) > 0;
  const canRun = mode === "reference" ? refSizes.includes(refSize) : hasProfile;

  useEffect(() => {
    if (profiles.loading || !canRun) return;
    setLoading(true);
    setError(undefined);
    api
      .post<CompareResponse>("/compare", {
        categorySlug: category,
        brandSlugs: selected.length ? selected : undefined,
        reference: mode === "reference" ? { brandSlug: refBrand, size: refSize } : undefined,
      })
      .then(setData)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category, selected, mode, refBrand, refSize, canRun, profiles.loading]);

  const rows = useMemo(() => {
    const r = [...(data?.rows ?? [])];
    return sort === "fit" ? r.sort((a, b) => rank(b.result) - rank(a.result)) : r.sort((a, b) => a.brand.name.localeCompare(b.brand.name));
  }, [data, sort]);

  const setCategory = (slug: string) => router.replace(`/app/compare?category=${slug}`, { scroll: false });
  const brandsForCategory = (brands.data?.brands ?? []).filter((b) => b.chartCategories?.includes(category));

  return (
    <>
      <PageHeader eyebrow="Cross-brand comparison" title="One body. Every brand's size." description="Your recommended size in each brand for a category, ranked by how well it fits — with the measurements behind each answer." />

      {/* Controls */}
      <section className="mb-6 space-y-5 rounded-md border border-line bg-surface p-4 sm:p-5">
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {cats.data?.categories.map((c) => <Chip key={c.slug} active={c.slug === category} onClick={() => setCategory(c.slug)}>{c.name}</Chip>)}
        </div>
        <div className="grid gap-4 border-t border-line pt-5 md:grid-cols-[auto_1fr] md:items-end md:gap-8">
          <Field label="Compare using">
            <Segmented label="Compare using" value={mode} onChange={setMode} options={[{ value: "profile", label: "My measurements" }, { value: "reference", label: "A size I wear" }]} />
          </Field>
          {mode === "reference" && (
            <div className="grid grid-cols-[1fr_120px] gap-3 sm:max-w-md">
              <Field label="I normally wear, in" htmlFor="ref-brand">
                <Select id="ref-brand" value={refBrand} onChange={(e) => setRefBrand(e.target.value)}>
                  {brandsForCategory.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label="Size" htmlFor="ref-size">
                <Select id="ref-size" value={refSize} onChange={(e) => setRefSize(e.target.value)} disabled={!refSizes.length}>
                  {refSizes.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Chip active={!selected.length} onClick={() => setSelected([])}>All brands</Chip>
            {brandsForCategory.map((b) => (
              <Chip key={b.slug} active={selected.includes(b.slug)} onClick={() => setSelected((s) => (s.includes(b.slug) ? s.filter((x) => x !== b.slug) : [...s, b.slug]))}>{b.name}</Chip>
            ))}
          </div>
          <Segmented label="Sort" size="sm" value={sort} onChange={setSort} options={[{ value: "fit", label: "Best fit" }, { value: "brand", label: "A–Z" }]} />
        </div>
      </section>

      {mode === "profile" && !profiles.loading && !hasProfile ? (
        <NoProfileCallout />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data || (loading && !data) ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className={cn("transition-opacity", loading && "opacity-60")}>
          {data.referenceNote && <Notice tone="accent" icon={<Info className="size-4" />} className="mb-4">{data.referenceNote}</Notice>}

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-md border border-line bg-surface md:block">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-left text-[11px] tracking-[0.1em] text-muted uppercase">
                  <th className="px-5 py-3 font-semibold">Brand</th>
                  <th className="px-5 py-3 font-semibold">Recommended size</th>
                  <th className="px-5 py-3 font-semibold">Fit assessment</th>
                  <th className="px-5 py-3 font-semibold">Confidence</th>
                  <th className="px-5 py-3 font-semibold">Data</th>
                  <th className="w-10 px-5 py-3"><span className="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isOpen = open === r.brand.slug;
                  const res = r.result;
                  return (
                    <FragmentRow key={r.brand.slug}>
                      <tr className={cn("cursor-pointer border-b border-line transition-colors hover:bg-canvas/40", isOpen && "bg-canvas/40")} onClick={() => setOpen(isOpen ? null : r.brand.slug)}>
                        <td className="px-5 py-4 font-bold tracking-[-0.01em]">{r.brand.name}</td>
                        <td className="px-5 py-4">
                          {res.status === "ok" ? (
                            <span className="flex items-center gap-2">
                              <span className="num grid h-8 min-w-10 place-items-center rounded-xs bg-ink px-2 text-[15px] font-semibold text-canvas">{res.recommendedSize}</span>
                              {res.alternativeSize && <span className="num text-[12.5px] text-muted">or {res.alternativeSize}</span>}
                            </span>
                          ) : (
                            <span className="text-[13px] text-faint">{res.status === "missing_measurements" ? "Needs measurements" : "Insufficient data"}</span>
                          )}
                        </td>
                        <td className="px-5 py-4">{res.status === "ok" ? <QualityBadge q={res.matchQuality} /> : "—"}</td>
                        <td className="px-5 py-4 text-[13px] text-muted">{res.status === "ok" ? CONFIDENCE[res.confidence].label.replace(" confidence", "") : "—"}</td>
                        <td className="px-5 py-4">{r.chart?.isDemo ? <DemoDataBadge /> : r.chart?.verification === "verified" ? <Badge tone="success">Verified</Badge> : <Badge tone="muted">Unverified</Badge>}</td>
                        <td className="px-5 py-4">
                          <button type="button" aria-expanded={isOpen} aria-label={`Show details for ${r.brand.name}`} className="grid size-8 place-items-center rounded-sm text-muted hover:text-ink">
                            <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-line bg-canvas/40">
                          <td colSpan={6} className="px-5 pt-1 pb-5"><RowDetail row={r} unit={unit} category={category} /></td>
                        </tr>
                      )}
                    </FragmentRow>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => {
              const res = r.result;
              const isOpen = open === r.brand.slug;
              return (
                <li key={r.brand.slug} className="overflow-hidden rounded-md border border-line bg-surface">
                  <button type="button" onClick={() => setOpen(isOpen ? null : r.brand.slug)} className="flex w-full items-center gap-4 p-4 text-left" aria-expanded={isOpen}>
                    <span className="num grid size-14 shrink-0 place-items-center rounded-sm bg-ink text-[20px] font-semibold text-canvas">{res.status === "ok" ? res.recommendedSize : "—"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-bold tracking-[-0.01em]">{r.brand.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        {res.status === "ok" ? <QualityBadge q={res.matchQuality} /> : <span className="text-[12.5px] text-faint">{res.status === "missing_measurements" ? "Needs measurements" : "Insufficient data"}</span>}
                        {res.status === "ok" && res.alternativeSize && <span className="num text-[12px] text-muted">or {res.alternativeSize}</span>}
                      </span>
                    </span>
                    <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", isOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-line">
                        <div className="p-4"><RowDetail row={r} unit={unit} category={category} /></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[12px] leading-relaxed text-faint">
            Calculated from each brand&apos;s stored size chart for this category. Product-specific results can differ — open a brand&apos;s products for garment-level fit.
          </p>
        </div>
      )}
    </>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function QualityBadge({ q }: { q: keyof typeof QUALITY }) {
  const meta = QUALITY[q];
  return <Badge tone={meta.tone === "success" ? "success" : meta.tone === "warning" ? "warning" : "danger"}>{meta.label}</Badge>;
}

function RowDetail({ row, unit, category }: { row: Row; unit: Unit; category: string }) {
  const res = row.result;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div>
        {res.status === "ok" ? (
          <>
            <p className="mb-3 text-[13.5px] leading-relaxed text-ink/80">{res.explanation}</p>
            <ul className="divide-y divide-line rounded-sm border border-line bg-surface">
              {res.measurements.map((m) => {
                const s = POINT_STATUS[m.status];
                return (
                  <li key={m.key} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3.5 py-2.5 text-[13px] sm:grid-cols-[110px_1fr_auto]">
                    <span className="font-semibold">{MEASUREMENT_LABEL[m.key]}</span>
                    <span className="num col-span-2 row-start-2 text-[12px] text-muted sm:col-span-1 sm:row-start-auto">
                      You {formatLength(m.userCm, unit)}
                      {m.referenceMinCm !== undefined && <> · {res.recommendedSize} fits {formatRange(m.referenceMinCm, m.referenceMaxCm!, unit)}</>}
                    </span>
                    <Badge tone={s.tone === "muted" ? "muted" : s.tone}>{s.label}</Badge>
                  </li>
                );
              })}
            </ul>
            {res.warnings.length > 0 && <ul className="mt-3 space-y-1 text-[12.5px] text-[#8f6328]">{res.warnings.map((w) => <li key={w}>• {w}</li>)}</ul>}
          </>
        ) : (
          <p className="text-[13.5px] text-muted">{res.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {res.status === "ok" && (
          <ul className="mb-2 space-y-1 text-[12.5px] text-muted">{res.confidenceReasons.map((c) => <li key={c}>• {c}</li>)}</ul>
        )}
        <Link href={`/app/find?category=${category}&brand=${row.brand.slug}&product=any`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold hover:underline">
          Full recommendation <ArrowRight className="size-3.5" />
        </Link>
        {row.productCount > 0 && (
          <Link href={`/app/discover?brand=${row.brand.slug}&category=${category}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold hover:underline">
            {row.productCount} product{row.productCount > 1 ? "s" : ""}{row.productsWithGarmentData ? ` (${row.productsWithGarmentData} with garment data)` : ""} <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

