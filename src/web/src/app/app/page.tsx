"use client";

import { ArrowRight, ArrowUpRight, Bookmark, MessageSquareText, Ruler, ScanSearch } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BodyDiagram } from "@/components/illustrations/body-diagram";
import { ProductImage, RecPill } from "@/components/app/product";
import { NoProfileCallout, QualityText } from "@/components/app/recommendation";
import { EmptyState, ErrorState, LinkButton, Panel, Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { FEEDBACK_FIT, MEASUREMENT_LABEL, firstName, greeting, relativeTime } from "@/lib/labels";
import { useSession } from "@/lib/session";
import type { BodyKey, EngineResult, Product, Profile, User } from "@/lib/types";
import { formatHeight, formatLength } from "@/lib/units";
import { useApi } from "@/lib/use-api";

interface Dashboard {
  user: User;
  primaryProfile: Profile | null;
  profileCount: number;
  recentRecommendations: { id: string; status: string; recommended_size: string | null; match_quality: string | null; created_at: string; brand_name: string; category_name: string; product_name: string | null; product_slug: string | null }[];
  recentBrands: { brand_name: string; brand_slug: string; category_name: string; category_slug: string; last_recommended_size: string | null; check_count: number; last_checked_at: string }[];
  savedProducts: Product[];
  recentFeedback: { id: string; purchased_size: string; overall_fit: string; created_at: string; brand_name: string; product_name: string | null }[];
}

interface CompareRow { brand: { slug: string; name: string }; result: EngineResult }

const KEY_POINTS: BodyKey[] = ["chest", "shoulder", "waist", "hip", "inseam", "neck"];

export default function OverviewPage() {
  const { unit, market } = useSession();
  const { data, error, loading, reload } = useApi<Dashboard>("/me/dashboard");
  const [preview, setPreview] = useState<CompareRow[] | null>(null);

  useEffect(() => {
    if (!data?.primaryProfile) return;
    setPreview(null);
    api.post<{ rows: CompareRow[] }>("/compare", { categorySlug: "t-shirts", record: false, market }).then((r) => setPreview(r.rows)).catch(() => setPreview([]));
  }, [data?.primaryProfile, market]);

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (loading || !data) return <OverviewSkeleton />;

  const p = data.primaryProfile;
  const pct = p ? Math.round(p.completion.ratio * 100) : 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-2">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.02em] md:text-[44px]">
            {greeting()}, {firstName(data.user.fullName)}.
          </h1>
        </div>
        <LinkButton href="/app/find" size="lg" className="w-full md:w-auto">
          <ScanSearch className="size-4" /> Find My Size
        </LinkButton>
      </header>

      {!p ? (
        <NoProfileCallout />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          {/* Profile card */}
          <section className="overflow-hidden rounded-md border border-line bg-surface">
            <div className="grid sm:grid-cols-[1fr_190px]">
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">Measurement profile</p>
                    <h2 className="mt-1.5 text-[20px] font-semibold tracking-[-0.015em]">{p.name}</h2>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {formatHeight(p.heightCm, unit)} · <span className="capitalize">{p.fitPreference}</span> fit · updated {relativeTime(p.updatedAt)}
                    </p>
                  </div>
                  <Link href="/app/measurements" className="text-[13px] font-semibold text-ink underline-offset-2 hover:underline">Edit</Link>
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex items-baseline justify-between text-[12.5px]">
                    <span className="text-muted">Profile completion</span>
                    <span className="num font-semibold">{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion">
                    <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[12px] text-faint">{p.completion.filled} of {p.completion.total} measurements</p>
                </div>
                <dl className="mt-5 grid grid-cols-3 gap-x-4 gap-y-3 border-t border-line pt-4">
                  {KEY_POINTS.map((k) => (
                    <div key={k}>
                      <dt className="text-[11.5px] text-muted">{MEASUREMENT_LABEL[k].replace(" width", "")}</dt>
                      <dd className="num text-[15px] font-semibold">{p.measurements[k] !== undefined ? formatLength(p.measurements[k], unit) : <span className="text-faint">—</span>}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="hidden border-l border-line bg-canvas/60 sm:block">
                <BodyDiagram compact values={p.measurements} />
              </div>
            </div>
          </section>

          {/* Brand comparison preview */}
          <Panel title="T-shirts across brands" action={<Link href="/app/compare" className="inline-flex items-center gap-1 text-[12.5px] font-semibold">Compare all <ArrowRight className="size-3.5" /></Link>} padded={false}>
            {!preview ? (
              <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <ul className="divide-y divide-line">
                {preview.filter((r) => r.result.status === "ok").slice(0, 6).map((r) => (
                  <li key={r.brand.slug} className="flex items-center justify-between px-5 py-3">
                    <span className="text-[14px] font-semibold">{r.brand.name}</span>
                    <span className="flex items-center gap-3">
                      {r.result.status === "ok" && <QualityText quality={r.result.matchQuality} />}
                      <span className="num grid h-7 min-w-9 place-items-center rounded-xs bg-ink px-2 text-[13px] font-semibold text-canvas">{r.result.status === "ok" ? r.result.recommendedSize : "—"}</span>
                    </span>
                  </li>
                ))}
                {preview.length === 0 && <li className="px-5 py-6 text-[13px] text-muted">Add your chest measurement to compare T-shirt sizes.</li>}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Recently recommended sizes" action={<Link href="/app/history" className="text-[12.5px] font-semibold">History</Link>} padded={false}>
          {data.recentRecommendations.length === 0 ? (
            <div className="p-5"><EmptyState className="py-10" icon={<ScanSearch className="size-5" />} title="No recommendations yet" body="Pick a brand and product to get your first size." action={<LinkButton href="/app/find" size="sm">Find my size</LinkButton>} /></div>
          ) : (
            <ul className="divide-y divide-line">
              {data.recentRecommendations.map((r) => (
                <li key={r.id}>
                  <Link href={r.product_slug ? `/app/products/${r.product_slug}` : "/app/history"} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-canvas/50">
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold">{r.product_name ?? `${r.category_name}`}</span>
                      <span className="block text-[12.5px] text-muted">{r.brand_name} · {relativeTime(r.created_at)}</span>
                    </span>
                    {r.recommended_size ? (
                      <span className="flex items-center gap-3"><QualityText quality={r.match_quality ?? undefined} /><span className="num grid h-7 min-w-9 place-items-center rounded-xs bg-ink px-2 text-[13px] font-semibold text-canvas">{r.recommended_size}</span></span>
                    ) : (
                      <span className="text-[12px] text-faint">Insufficient data</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recently checked brands" action={<Link href="/app/brands" className="text-[12.5px] font-semibold">All brands</Link>} padded={false}>
          {data.recentBrands.length === 0 ? (
            <p className="p-5 text-[13.5px] text-muted">Brands you check will appear here with your last size.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
              {data.recentBrands.slice(0, 6).map((b) => (
                <li key={`${b.brand_slug}-${b.category_slug}`} className="bg-surface">
                  <Link href={`/app/find?category=${b.category_slug}&brand=${b.brand_slug}`} className="flex h-full flex-col p-4 transition-colors hover:bg-canvas/60">
                    <span className="text-[14px] font-bold tracking-[-0.01em]">{b.brand_name}</span>
                    <span className="text-[12px] text-muted">{b.category_name}</span>
                    <span className="num mt-3 text-[22px] font-semibold">{b.last_recommended_size ?? "—"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Saved products" action={<Link href="/app/saved" className="text-[12.5px] font-semibold">View all</Link>}>
          {data.savedProducts.length === 0 ? (
            <div className="flex items-center gap-4 text-[13.5px] text-muted">
              <Bookmark className="size-5 shrink-0" strokeWidth={1.6} /> Save products while you browse to keep their recommended size handy.
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {data.savedProducts.map((sp) => (
                <li key={sp.id}>
                  <Link href={`/app/products/${sp.slug}`} className="block">
                    <ProductImage product={sp} className="aspect-square rounded-sm" sizes="160px" />
                    <p className="mt-2 truncate text-[12.5px] font-semibold">{sp.name}</p>
                    <div className="mt-1"><RecPill rec={sp.recommendation} compact /></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent fit feedback" action={<Link href="/app/history" className="text-[12.5px] font-semibold">Give feedback</Link>} padded={false}>
          {data.recentFeedback.length === 0 ? (
            <div className="flex items-center gap-4 p-5 text-[13.5px] text-muted">
              <MessageSquareText className="size-5 shrink-0" strokeWidth={1.6} /> Tell us how things fit after you buy — it sharpens your next recommendation for that brand.
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.recentFeedback.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold">{f.product_name ?? f.brand_name}</span>
                    <span className="block text-[12.5px] text-muted">Bought {f.purchased_size} · {relativeTime(f.created_at)}</span>
                  </span>
                  <span className="text-[12.5px] font-semibold">{FEEDBACK_FIT.find((x) => x.value === f.overall_fit)?.label}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {p && (
        <Link href="/app/discover" className="group flex items-center justify-between rounded-md bg-night px-6 py-6 text-paper">
          <span>
            <span className="block text-[11px] font-semibold tracking-[0.16em] text-[#8a877f] uppercase">Product discovery</span>
            <span className="mt-1 block font-serif text-[22px] sm:text-[26px]">Browse pieces that fit you best.</span>
          </span>
          <ArrowUpRight className="size-6 text-accent transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
      {!p && (
        <p className="flex items-center gap-2 text-[13px] text-muted"><Ruler className="size-4" /> Your profile stays private — measurements are never shared with brands.</p>
      )}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-11 w-80 max-w-full" /></div>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      <div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>
    </div>
  );
}
