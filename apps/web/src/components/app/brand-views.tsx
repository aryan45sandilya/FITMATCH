"use client";

import { ArrowLeft, ArrowRight, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/session";
import type { Brand, Category, ChartData, Market } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { MARKET_LABEL, MARKET_OPTIONS, relativeTime } from "@/lib/labels";
import { Badge, EmptyState, ErrorState, Input, LinkButton, Notice, Segmented, Skeleton, cn } from "../ui/primitives";
import { MarketPicker } from "./market-picker";
import { SizeTable } from "./chart-table";

export function BrandDirectory({ basePath }: { basePath: string }) {
  const brands = useApi<{ brands: Brand[] }>("/brands");
  const categories = useApi<{ categories: Category[] }>("/categories");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (brands.data?.brands ?? []).filter(
      (b) => (!term || b.name.toLowerCase().includes(term) || b.country?.toLowerCase().includes(term)) && (!cat || b.chartCategories?.includes(cat)),
    );
  }, [brands.data, q, cat]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brands" className="pl-10" aria-label="Search brands" />
        </div>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          <Chip active={!cat} onClick={() => setCat(null)}>All categories</Chip>
          {categories.data?.categories.map((c) => (
            <Chip key={c.slug} active={cat === c.slug} onClick={() => setCat(cat === c.slug ? null : c.slug)}>
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      {brands.error && <ErrorState message={brands.error.message} onRetry={brands.reload} />}
      {brands.loading && (
        <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-3 bg-surface p-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      )}
      {!brands.loading && !list.length && !brands.error && (
        <EmptyState icon={<Search className="size-5" />} title="No brands match" body="Try a different name or clear the category filter." />
      )}
      {list.length > 0 && (
        <ul className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <li key={b.id} className="bg-surface">
              <Link href={`${basePath}/${b.slug}`} className="group flex h-full flex-col p-6 transition-colors hover:bg-hover">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[20px] font-bold tracking-[-0.02em]">{b.name}</h3>
                    <p className="mt-0.5 text-[12.5px] text-muted">{b.country}</p>
                  </div>
                  <ArrowRight className="size-4 text-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                </div>
                <p className="mt-4 line-clamp-2 text-[13.5px] leading-relaxed text-muted">{b.description}</p>
                <div className="mt-5 flex flex-wrap items-center gap-1.5">
                  <Badge tone="muted">{b.chartCategories?.length ?? 0} size charts</Badge>
                  <Badge tone="muted">{b.productCount ?? 0} products</Badge>
                  {b.lastCheckedAt && <Badge tone="accent">Checked {relativeTime(b.lastCheckedAt)}</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors",
        active ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface text-muted hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

type BrandChart = ChartData & { categorySlug: string };

/** Picks the chart to show for a category + market: the market's own real chart, then any real chart, then demo. */
function chartFor(charts: BrandChart[], category: string, market: Market) {
  const pool = charts.filter((c) => c.categorySlug === category);
  return (
    pool.find((c) => c.market === market && !c.isDemo) ??
    pool.find((c) => !c.isDemo && c.market === "UK_EU") ??
    pool.find((c) => !c.isDemo) ??
    pool[0]
  );
}

export function BrandDetail({ slug, backHref, findHref }: { slug: string; backHref: string; findHref?: string }) {
  const { data, error, loading, reload } = useApi<{ brand: Brand; charts: BrandChart[]; marketNotes: { market: Market; note: string }[] }>(`/brands/${slug}`);
  const categories = useApi<{ categories: Category[] }>("/categories");
  const { unit, setUnit, user, market: sessionMarket } = useSession();
  const [active, setActive] = useState<string | null>(null);
  const [market, setMarket] = useState<Market>(sessionMarket);
  const [localUnit, setLocalUnit] = useState<"cm" | "in">("cm");
  const u = user ? unit : localUnit;
  useEffect(() => setMarket(sessionMarket), [sessionMarket]);

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (loading || !data)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-5 w-96 max-w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );

  const catOrder = categories.data?.categories.map((c) => c.slug) ?? [];
  const catSlugs = [...new Set(data.charts.map((c) => c.categorySlug))].sort((a, b) => catOrder.indexOf(a) - catOrder.indexOf(b));
  const activeCat = active && catSlugs.includes(active) ? active : catSlugs[0];
  const current = activeCat ? chartFor(data.charts, activeCat, market) : undefined;
  const catName = (s: string) => categories.data?.categories.find((c) => c.slug === s)?.name ?? s;
  const note = data.marketNotes.find((n) => n.market === market)?.note;
  const marketsWithData = new Set(data.charts.filter((c) => !c.isDemo).map((c) => c.market));
  const fallback = current && current.market !== market;

  return (
    <div>
      <Link href={backHref} className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All brands
      </Link>
      <div className="mb-10 grid gap-6 border-b border-line pb-10 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <p className="eyebrow mb-3">{data.brand.country}</p>
          <h1 className="text-[38px] leading-none font-bold tracking-[-0.035em] md:text-[52px]">{data.brand.name}</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{data.brand.description}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {MARKET_OPTIONS.map((m) => (
              <Badge key={m.value} tone={marketsWithData.has(m.value) ? "success" : "muted"}>
                {m.label}: {marketsWithData.has(m.value) ? "brand chart" : "not published"}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap gap-2">
            {findHref && <LinkButton href={findHref} size="sm">Find my size</LinkButton>}
            {data.brand.websiteUrl && (
              <LinkButton href={data.brand.websiteUrl} size="sm" variant="secondary">
                Visit site <ExternalLink className="size-3.5" />
              </LinkButton>
            )}
          </div>
        </div>
      </div>

      {catSlugs.length === 0 ? (
        <EmptyState title="No size charts yet" body="We haven't collected sizing data for this brand yet." />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {catSlugs.map((c) => (
                <Chip key={c} active={activeCat === c} onClick={() => setActive(c)}>
                  {catName(c)}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MarketPicker variant="compact" value={market} onChange={setMarket} />
              <Segmented label="Units" size="sm" value={u} onChange={(v) => (user ? void setUnit(v) : setLocalUnit(v))} options={[{ value: "cm", label: "cm" }, { value: "in", label: "in" }]} />
            </div>
          </div>
          {fallback && current && (
            <Notice tone={current.isDemo ? "warning" : "accent"} className="mb-4">
              {current.isDemo
                ? `${data.brand.name} has no published ${MARKET_LABEL[market]} chart for ${catName(activeCat!).toLowerCase()} on file — showing demonstration data.`
                : `${data.brand.name} doesn't publish ${market === "IN" ? "an" : "a"} ${MARKET_LABEL[market]} chart${note ? ` (${note.replace(/\.$/, "")})` : ""}. Showing their ${MARKET_LABEL[current.market]} chart instead.`}
            </Notice>
          )}
          {current && <SizeTable chart={current} unit={u} caption={current.name} />}
          {current?.notes && !current.isDemo && <p className="mt-3 text-[12.5px] leading-relaxed text-muted">Note: {current.notes}</p>}
        </>
      )}
    </div>
  );
}
