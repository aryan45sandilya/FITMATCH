"use client";

import { ArrowLeft, ArrowRight, Check, ExternalLink, MessageSquarePlus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeedbackDialog, type FeedbackTarget } from "@/components/app/feedback-form";
import { ProductImage } from "@/components/app/product";
import { NoProfileCallout, RecommendationResult } from "@/components/app/recommendation";
import { GarmentIllustration } from "@/components/illustrations/garment";
import { Button, EmptyState, ErrorState, Input, LinkButton, Notice, PageHeader, Skeleton, cn } from "@/components/ui/primitives";
import { api, ApiError, qs } from "@/lib/api";
import { FIT_OPTIONS, MARKET_LABEL } from "@/lib/labels";
import { useSession } from "@/lib/session";
import type { Category, EngineResult, Fit, Market, Product, Profile } from "@/lib/types";
import { formatPrice } from "@/lib/units";
import { useApi } from "@/lib/use-api";

const CATEGORY_COLORS: Record<string, string> = {
  "t-shirts": "#E9E4DA", "polo-t-shirts": "#22324A", shirts: "#C9D2D9", jeans: "#4A5868", trousers: "#5A5650",
  jackets: "#7C93AE", hoodies: "#8C8577", shorts: "#C2B191", "formal-wear": "#2E3138",
};

interface RecResponse {
  recommendationId: string | null;
  result: EngineResult;
  fitPreference: Fit;
  product?: Product;
  brand?: { name: string; slug: string };
  category?: { name: string; slug: string };
  chart?: { name: string; market: string; isDemo: boolean; source: string; sourceUrl: string | null } | null;
}

export default function FindPage() {
  return (
    <Suspense>
      <Finder />
    </Suspense>
  );
}

function Finder() {
  const router = useRouter();
  const params = useSearchParams();
  const { unit, market } = useSession();
  const category = params.get("category");
  const brand = params.get("brand");
  const product = params.get("product"); // slug, or "any" for the brand chart
  const welcome = params.get("welcome");

  const profiles = useApi<{ profiles: Profile[] }>("/profiles");
  const cats = useApi<{ categories: Category[] }>("/categories");
  const allBrands = useApi<{ brands: { slug: string; name: string }[] }>("/brands");
  allBrands.data?.brands.forEach((b) => (BRAND_NAMES[b.slug] = b.name));

  const set = useCallback(
    (next: Record<string, string | null>) => {
      const s = new URLSearchParams(params.toString());
      s.delete("welcome");
      for (const [k, v] of Object.entries(next)) v === null ? s.delete(k) : s.set(k, v);
      router.push(`/app/find?${s.toString()}`, { scroll: true });
    },
    [params, router],
  );

  const step = !category ? 0 : !brand ? 1 : !product ? 2 : 3;
  const cat = cats.data?.categories.find((c) => c.slug === category);
  const hasProfile = (profiles.data?.profiles.length ?? 0) > 0;

  return (
    <>
      <PageHeader eyebrow="Find my size" title={step === 3 ? "Your recommendation" : ["Choose a category", "Choose a brand", "Choose a product"][step]!} description={step < 3 ? "We'll compare this brand's sizing with your measurement profile." : undefined} />

      {welcome && (
        <Notice tone="success" icon={<Check className="size-4" />} className="mb-6">Your profile is saved. Pick something you&apos;re shopping for to see your size.</Notice>
      )}

      {/* Breadcrumb trail */}
      <ol className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]" aria-label="Progress">
        {[
          { label: cat?.name ?? "Category", active: step === 0, onClick: () => set({ category: null, brand: null, product: null }) },
          { label: brand ? brandName(brand) : "Brand", active: step === 1, onClick: () => set({ brand: null, product: null }), disabled: step < 1 },
          { label: product ? (product === "any" ? "General fit" : "Product") : "Product", active: step === 2, onClick: () => set({ product: null }), disabled: step < 2 },
          { label: "Result", active: step === 3, disabled: true },
        ].map((c, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-faint" aria-hidden>/</span>}
            <button type="button" onClick={c.onClick} disabled={c.disabled || c.active} className={cn("font-semibold transition-colors", c.active ? "text-ink" : c.disabled ? "text-faint" : "text-muted hover:text-ink underline-offset-2 hover:underline")} aria-current={c.active ? "step" : undefined}>
              {c.label}
            </button>
          </li>
        ))}
      </ol>

      {profiles.loading ? (
        <Skeleton className="h-80" />
      ) : !hasProfile ? (
        <NoProfileCallout />
      ) : step === 0 ? (
        <CategoryStep categories={cats.data?.categories} loading={cats.loading} onPick={(slug) => set({ category: slug })} />
      ) : step === 1 ? (
        <BrandStep category={category!} market={market} onPick={(slug) => set({ brand: slug })} />
      ) : step === 2 ? (
        <ProductStep category={category!} brand={brand!} onPick={(slug) => set({ product: slug })} />
      ) : (
        <ResultStep key={market} category={category!} brand={brand!} product={product!} unit={unit} market={market} categoryName={cat?.name} />
      )}
    </>
  );
}

const BRAND_NAMES: Record<string, string> = {};
function brandName(slug: string) {
  return BRAND_NAMES[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function CategoryStep({ categories, loading, onPick }: { categories?: Category[]; loading: boolean; onPick: (slug: string) => void }) {
  if (loading) return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}</div>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {categories?.map((c) => (
        <li key={c.slug}>
          <button type="button" onClick={() => onPick(c.slug)} className="group flex w-full flex-col rounded-md border border-line bg-surface p-3 text-left transition-all hover:border-ink">
            <span className="grid aspect-square place-items-center rounded-sm bg-canvas p-5 transition-colors group-hover:bg-[#efece6]">
              <GarmentIllustration category={c.slug} colorway={CATEGORY_COLORS[c.slug]} />
            </span>
            <span className="mt-3 flex items-center justify-between px-1 pb-1">
              <span className="text-[14px] font-semibold">{c.name}</span>
              <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function BrandStep({ category, market, onPick }: { category: string; market: Market; onPick: (slug: string) => void }) {
  const { data, error, loading, reload } = useApi<{ brands: { id: string; slug: string; name: string; country: string; chartId: string | null; chartMarket: string | null; chartIsSourced: boolean | null; productCount: number }[] }>(`/categories/${category}/brands?market=${market}`);
  const [q, setQ] = useState("");
  const list = useMemo(() => (data?.brands ?? []).filter((b) => b.name.toLowerCase().includes(q.trim().toLowerCase())), [data, q]);
  useEffect(() => data?.brands.forEach((b) => (BRAND_NAMES[b.slug] = b.name)), [data]);

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  return (
    <>
      <div className="relative mb-5 max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brands" className="pl-10" aria-label="Search brands" autoFocus />
      </div>
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : !list.length ? (
        <EmptyState title="No brands found" body={q ? "Try another name." : "We don't have sizing data for this category yet."} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <li key={b.slug}>
              <button type="button" onClick={() => onPick(b.slug)} className="group flex w-full items-center justify-between rounded-md border border-line bg-surface p-5 text-left transition-colors hover:border-ink">
                <span>
                  <span className="block text-[18px] font-bold tracking-[-0.02em]">{b.name}</span>
                  <span className="mt-0.5 block text-[12.5px] text-muted">
                    {b.productCount} product{b.productCount === 1 ? "" : "s"} · {!b.chartId ? "no brand chart" : !b.chartIsSourced ? "demo chart only" : b.chartMarket === market ? `${MARKET_LABEL[market]} brand chart` : `${MARKET_LABEL[b.chartMarket as Market]} chart (no ${MARKET_LABEL[market]} chart)`}
                  </span>
                </span>
                <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ProductStep({ category, brand, onPick }: { category: string; brand: string; onPick: (slug: string) => void }) {
  const { data, error, loading, reload } = useApi<{ products: Product[] }>(`/products${qs({ category, brand, limit: 60 })}`);
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => onPick("any")} className="group flex w-full items-center justify-between rounded-md border border-dashed border-line-strong bg-surface/60 p-5 text-left transition-colors hover:border-ink">
        <span>
          <span className="block text-[15px] font-semibold">I don&apos;t have a specific product</span>
          <span className="mt-0.5 block text-[13px] text-muted">Use {brandName(brand)}&apos;s general size chart for this category.</span>
        </span>
        <ArrowRight className="size-4 text-faint group-hover:text-ink" />
      </button>
      {loading ? (
        Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)
      ) : (
        <ul className="space-y-3">
          {data?.products.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p.slug)} className="group grid w-full grid-cols-[88px_1fr] gap-4 rounded-md border border-line bg-surface p-3 text-left transition-colors hover:border-ink sm:grid-cols-[104px_1fr_auto] sm:items-center">
                <ProductImage product={p} className="aspect-square rounded-sm" sizes="104px" />
                <span className="min-w-0 self-center">
                  <span className="block text-[15px] leading-snug font-semibold">{p.name}</span>
                  <span className="mt-1 block text-[12.5px] text-muted">
                    <span className="capitalize">{p.fitType} fit</span> · {p.category.name} · {formatPrice(p.price, p.currency)}
                  </span>
                  <span className="num mt-1 block text-[12px] text-faint">Sizes {p.sizes.join(" · ")}</span>
                  <span className="mt-1.5 block text-[11.5px] font-medium text-muted">{p.hasGarmentData ? "Garment measurements on file" : "Brand chart only"}</span>
                </span>
                <ArrowRight className="hidden size-4 text-faint group-hover:text-ink sm:block" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultStep({ category, brand, product, unit, market, categoryName }: { category: string; brand: string; product: string; unit: "cm" | "in"; market: Market; categoryName?: string }) {
  // `override` is only set when the user picks a fit; the profile's own preference comes back from the API.
  const [override, setOverride] = useState<Fit | null>(null);
  const [data, setData] = useState<RecResponse>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackTarget | null>(null);
  const lastRequest = useRef<string | null>(null);
  const fit = override ?? data?.fitPreference ?? null;
  const setFit = setOverride;

  useEffect(() => {
    const body = product === "any" ? { brandSlug: brand, categorySlug: category, fitPreference: override ?? undefined, market } : { productSlug: product, fitPreference: override ?? undefined, market };
    // Each request is stored in the user's history, so never send the same one twice (e.g. dev StrictMode re-runs).
    const key = JSON.stringify(body);
    if (lastRequest.current === key) return;
    lastRequest.current = key;
    setLoading(true);
    setError(undefined);
    api
      .post<RecResponse>("/recommendations", body)
      .then(setData)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category, brand, product, override, market]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <Skeleton className="h-[560px]" />;

  const p = data.product;
  const title = p ? `${p.brand.name} — ${p.name}` : `${data.brand?.name} ${data.category?.name ?? categoryName}`;
  const okResult = data.result.status === "ok" ? data.result : null;
  const ok = Boolean(okResult);
  const openFeedback = () =>
    okResult &&
    setFeedback({
      title,
      sizes: p?.sizes.length ? p.sizes : okResult.sizes.map((s) => s.size),
      recommendedSize: okResult.recommendedSize,
      productId: p?.id,
      recommendationId: data.recommendationId,
      isBottom: ["jeans", "trousers", "shorts"].includes(category),
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className={cn("transition-opacity", loading && "opacity-60")}>
        <RecommendationResult
          result={data.result}
          unit={unit}
          context={<>{title}</>}
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-muted">Bought it? Tell us how it fit — your next recommendation gets sharper.</p>
              {ok && (
                <Button variant="secondary" size="sm" onClick={openFeedback}>
                  <MessageSquarePlus className="size-4" /> Give fit feedback
                </Button>
              )}
            </div>
          }
        />
      </div>
      <aside className="space-y-4">
        <section className="rounded-md border border-line bg-surface p-5">
          <h3 className="mb-1 text-[14px] font-semibold">Fit preference</h3>
          <p className="mb-3 text-[12.5px] text-muted">Recalculates instantly.</p>
          <div className="grid grid-cols-2 gap-2">
            {FIT_OPTIONS.map((o) => (
              <button key={o.value} type="button" onClick={() => setFit(o.value)} aria-pressed={fit === o.value} className={cn("h-10 rounded-sm border text-[13px] font-semibold transition-colors", fit === o.value ? "border-ink bg-ink text-canvas" : "border-line-strong hover:border-ink")}>
                {o.label}
              </button>
            ))}
          </div>
        </section>
        {p && (
          <section className="overflow-hidden rounded-md border border-line bg-surface">
            <ProductImage product={p} className="aspect-[4/3]" sizes="300px" />
            <div className="space-y-3 p-5">
              <div>
                <p className="text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">{p.brand.name}</p>
                <p className="text-[15px] font-semibold">{p.name}</p>
                <p className="mt-1 text-[12.5px] text-muted capitalize">{p.fitType} fit · {p.stretch === "none" ? "no" : p.stretch} stretch</p>
              </div>
              <LinkButton href={`/app/products/${p.slug}`} variant="secondary" size="sm" full>Product details & size chart</LinkButton>
              {p.externalUrl && (
                <LinkButton href={p.externalUrl} size="sm" full>Shop at {p.brand.name} <ExternalLink className="size-3.5" /></LinkButton>
              )}
              {p.isDemo && <p className="text-[11.5px] leading-relaxed text-faint">Demo product — the link opens the brand&apos;s website, not a specific listing.</p>}
            </div>
          </section>
        )}
        {data.chart && (
          <section className="rounded-md border border-line bg-surface p-5 text-[12.5px] leading-relaxed text-muted">
            <h3 className="mb-1 text-[14px] font-semibold text-ink">Sizing source</h3>
            <p>{data.chart.name}</p>
            <p className="mt-1">{data.chart.isDemo ? "Demonstration data — not the brand's chart." : `${MARKET_LABEL[data.chart.market as Market]} chart from ${data.chart.source}.`}</p>
            {data.chart.sourceUrl && <a href={data.chart.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-ink hover:underline">View brand's chart <ExternalLink className="size-3" /></a>}
          </section>
        )}
        <Link href={`/app/compare?category=${category}`} className="flex items-center justify-between rounded-md bg-night px-5 py-4 text-[14px] font-semibold text-canvas">
          Compare across brands <ArrowRight className="size-4 text-accent" />
        </Link>
        <Link href={`/app/find?category=${category}`} className="flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Try another brand
        </Link>
      </aside>
      <FeedbackDialog target={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
