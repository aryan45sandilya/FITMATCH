"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ProductCard, ProductCardSkeleton } from "@/components/app/product";
import { Button, Checkbox, EmptyState, ErrorState, Input, PageHeader, Select, cn } from "@/components/ui/primitives";
import { api, qs } from "@/lib/api";
import { FIT_OPTIONS } from "@/lib/labels";
import type { Brand, Category, Product } from "@/lib/types";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/use-api";

interface ListResponse { total: number; products: Product[]; priceRange: { min: number; max: number }; hasProfile: boolean }
const PAGE = 12;

export default function DiscoverPage() {
  return (
    <Suspense>
      <Discover />
    </Suspense>
  );
}

const csv = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

function Discover() {
  const router = useRouter();
  const params = useSearchParams();
  const brands = useApi<{ brands: Brand[] }>("/brands");
  const cats = useApi<{ categories: Category[] }>("/categories");
  const { market } = useSession();

  const filters = {
    search: params.get("search") ?? "",
    brand: csv(params.get("brand")),
    category: csv(params.get("category")),
    fit: csv(params.get("fit")),
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
    sort: params.get("sort") ?? "recommended",
    fitsMe: params.get("fitsMe") === "true",
  };
  const query = qs({ ...filters, fitsMe: filters.fitsMe ? "true" : undefined, limit: PAGE, market });

  const [items, setItems] = useState<Product[]>([]);
  const [meta, setMeta] = useState<Omit<ListResponse, "products">>();
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState(filters.search);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(undefined);
    api
      .get<ListResponse>(`/products${query}`)
      .then(({ products, ...m }) => {
        setItems(products);
        setMeta(m);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query]);

  // Debounced search → URL
  useEffect(() => {
    if (search === filters.search) return;
    const t = setTimeout(() => update({ search: search || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function update(next: Record<string, string | null>) {
    const s = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) (v === null || v === "" ? s.delete(k) : s.set(k, v));
    router.replace(`/app/discover?${s.toString()}`, { scroll: false });
  }
  const toggle = (key: "brand" | "category" | "fit", value: string) => {
    const cur = filters[key];
    update({ [key]: (cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]).join(",") || null });
  };

  async function loadMore() {
    setMore(true);
    try {
      const r = await api.get<ListResponse>(`/products${qs({ ...filters, fitsMe: filters.fitsMe ? "true" : undefined, limit: PAGE, offset: items.length, market })}`);
      setItems((x) => [...x, ...r.products]);
    } finally {
      setMore(false);
    }
  }

  const activeCount = filters.brand.length + filters.category.length + filters.fit.length + (filters.minPrice ? 1 : 0) + (filters.maxPrice ? 1 : 0) + (filters.fitsMe ? 1 : 0);

  const panel = (
    <FilterPanel
      brands={brands.data?.brands ?? []}
      categories={cats.data?.categories ?? []}
      filters={filters}
      toggle={toggle}
      update={update}
      priceRange={meta?.priceRange}
      hasProfile={meta?.hasProfile ?? false}
    />
  );

  return (
    <>
      <PageHeader eyebrow="Product discovery" title="Pieces, sized for you." description="Every product shows the size we'd recommend for your profile. Purchases happen on the retailer's own site." />

      <div className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, brands, categories" className="pl-10" aria-label="Search products" type="search" />
        </div>
        <Select aria-label="Sort products" value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className="hidden w-48 sm:block">
          <option value="recommended">Best fit first</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </Select>
        <Button variant="secondary" onClick={() => setSheet(true)} className="lg:hidden" aria-label="Filters">
          <SlidersHorizontal className="size-4" />
          {activeCount > 0 && <span className="num grid size-5 place-items-center rounded-full bg-ink text-[10.5px] text-canvas">{activeCount}</span>}
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">{panel}</aside>
        <div className="min-w-0">
          {error && <ErrorState message={error} />}
          <div className="mb-4 flex items-center justify-between text-[13px] text-muted">
            <span aria-live="polite">{loading ? "Loading…" : `${meta?.total ?? 0} product${meta?.total === 1 ? "" : "s"}`}</span>
            {activeCount > 0 && (
              <button type="button" onClick={() => router.replace("/app/discover")} className="font-semibold text-ink hover:underline">Clear filters</button>
            )}
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
          ) : items.length === 0 ? (
            <EmptyState icon={<Search className="size-5" />} title="Nothing matches those filters" body="Try removing a filter or searching for something broader." action={<Button variant="secondary" size="sm" onClick={() => router.replace("/app/discover")}>Clear all filters</Button>} />
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
                {items.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
              </ul>
              {meta && items.length < meta.total && (
                <div className="mt-10 flex justify-center">
                  <Button variant="secondary" onClick={loadMore} loading={more}>Load more</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {sheet && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-night/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.div role="dialog" aria-modal="true" aria-label="Filters" className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-lg bg-surface" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 38 }}>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-[16px] font-semibold">Filters</h2>
                <button type="button" onClick={() => setSheet(false)} className="grid size-9 place-items-center" aria-label="Close filters"><X className="size-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <Select aria-label="Sort products" value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className="mb-6">
                  <option value="recommended">Best fit first</option>
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                </Select>
                {panel}
              </div>
              <div className="border-t border-line p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                <Button full size="lg" onClick={() => setSheet(false)}>Show {meta?.total ?? ""} results</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function FilterPanel({
  brands, categories, filters, toggle, update, priceRange, hasProfile,
}: {
  brands: Brand[]; categories: Category[];
  filters: { brand: string[]; category: string[]; fit: string[]; minPrice: string; maxPrice: string; fitsMe: boolean };
  toggle: (k: "brand" | "category" | "fit", v: string) => void; update: (n: Record<string, string | null>) => void;
  priceRange?: { min: number; max: number }; hasProfile: boolean;
}) {
  const [min, setMin] = useState(filters.minPrice);
  const [max, setMax] = useState(filters.maxPrice);
  const group = useMemo(() => [
    { key: "category" as const, title: "Category", items: categories.map((c) => ({ value: c.slug, label: c.name })) },
    { key: "brand" as const, title: "Brand", items: brands.map((b) => ({ value: b.slug, label: b.name })) },
    { key: "fit" as const, title: "Fit type", items: FIT_OPTIONS.map((f) => ({ value: f.value, label: f.label })) },
  ], [brands, categories]);

  return (
    <div className="space-y-7">
      {hasProfile && (
        <Checkbox checked={filters.fitsMe} onChange={(v) => update({ fitsMe: v ? "true" : null })} label="Good fits only" description="Products where your size is a good or excellent match." />
      )}
      {group.map((g) => (
        <fieldset key={g.key}>
          <legend className="eyebrow mb-3">{g.title}</legend>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const on = filters[g.key].includes(i.value);
              return (
                <li key={i.value}>
                  <button type="button" onClick={() => toggle(g.key, i.value)} aria-pressed={on} className={cn("flex h-9 w-full items-center gap-2.5 rounded-xs px-1 text-left text-[13.5px] transition-colors", on ? "font-semibold text-ink" : "text-muted hover:text-ink")}>
                    <span className={cn("grid size-4 place-items-center rounded-[3px] border transition-colors", on ? "border-ink bg-ink" : "border-line-strong")}>
                      {on && <svg viewBox="0 0 12 12" className="size-2.5 text-canvas" aria-hidden><path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>}
                    </span>
                    {i.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
      <fieldset>
        <legend className="eyebrow mb-3">Price (USD)</legend>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); update({ minPrice: min || null, maxPrice: max || null }); }}>
          <Input aria-label="Minimum price" inputMode="numeric" placeholder={String(priceRange?.min ?? 0)} value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} className="h-9" onBlur={() => update({ minPrice: min || null })} />
          <span className="text-faint">–</span>
          <Input aria-label="Maximum price" inputMode="numeric" placeholder={String(priceRange?.max ?? "")} value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} className="h-9" onBlur={() => update({ maxPrice: max || null })} />
        </form>
      </fieldset>
    </div>
  );
}
