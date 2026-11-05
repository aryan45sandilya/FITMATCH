"use client";

import { ArrowLeft, ExternalLink, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { DemoDataBadge } from "@/components/brand";
import { SizeTable } from "@/components/app/chart-table";
import { FeedbackDialog, type FeedbackTarget } from "@/components/app/feedback-form";
import { ProductImage, SaveButton } from "@/components/app/product";
import { NoProfileCallout, RecommendationResult } from "@/components/app/recommendation";
import { Badge, Button, ErrorState, LinkButton, Segmented, Skeleton, cn } from "@/components/ui/primitives";
import { qs } from "@/lib/api";
import { FEEDBACK_FIT, FIT_OPTIONS, MARKET_LABEL } from "@/lib/labels";
import { useSession } from "@/lib/session";
import type { ChartData, EngineResult, Fit, GarmentData, Product } from "@/lib/types";
import { formatPrice } from "@/lib/units";
import { useApi } from "@/lib/use-api";

interface Detail {
  product: Product;
  chart: ChartData | null;
  garment: GarmentData | null;
  feedbackSummary: Record<string, number>;
  recommendation: EngineResult | null;
  fitPreference: Fit | null;
  profile: { id: string; name: string } | null;
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { unit, setUnit, market } = useSession();
  const marketName = MARKET_LABEL[market];
  const [fit, setFit] = useState<Fit | null>(null);
  const [view, setView] = useState(0);
  // null = follow the data the recommendation used; set once the shopper picks a tab.
  const [tabChoice, setTab] = useState<"garment" | "chart" | null>(null);
  const [feedback, setFeedback] = useState<FeedbackTarget | null>(null);
  const { data, error, loading, reload } = useApi<Detail>(`/products/${slug}${qs({ fit, market })}`);

  if (error) return <ErrorState message={error.status === 404 ? "We couldn't find that product." : error.message} onRetry={reload} />;
  if (!data) return <DetailSkeleton />;

  const { product: p, recommendation: r } = data;
  const rec = r?.status === "ok" ? r : null;
  const activeFit = fit ?? data.fitPreference;
  const views = p.imageUrls.length > 1 ? p.imageUrls : null;
  const feedbackTotal = Object.values(data.feedbackSummary).reduce((a, b) => a + b, 0);
  const tab = tabChoice ?? (rec?.basis === "body_chart" ? "chart" : "garment");
  const showGarment = Boolean(data.garment) && (tab === "garment" || !data.chart);

  return (
    <>
      <Link href="/app/discover" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Product discovery
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        {/* Gallery */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="relative">
            {views ? (
              <ProductImage product={{ ...p, imageUrls: [views[view]!] }} className="aspect-[4/5] rounded-md" priority sizes="(min-width: 1024px) 50vw, 100vw" />
            ) : (
              <ProductImage product={p} className="aspect-[4/5] rounded-md" priority sizes="(min-width: 1024px) 50vw, 100vw" />
            )}
            {p.isDemo && <DemoDataBadge className="absolute top-4 left-4" />}
            <SaveButton productId={p.id} saved={Boolean(p.isSaved)} className="absolute top-3 right-3" />
          </div>
          {views && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {views.map((u, i) => (
                <button key={u} type="button" onClick={() => setView(i)} className={cn("overflow-hidden rounded-sm border-2", i === view ? "border-ink" : "border-transparent")} aria-label={`Image ${i + 1}`}>
                  <ProductImage product={{ ...p, imageUrls: [u] }} className="aspect-square" sizes="100px" />
                </button>
              ))}
            </div>
          )}
          {!p.imageUrls.length && <p className="mt-2 text-[11.5px] text-faint">Illustration — product photography not on file.</p>}
        </div>

        {/* Info */}
        <div className="min-w-0">
          <Link href={`/app/brands/${p.brand.slug}`} className="text-[12px] font-semibold tracking-[0.12em] text-muted uppercase hover:text-ink">{p.brand.name}</Link>
          <h1 className="mt-2 text-[30px] leading-[1.1] font-semibold tracking-[-0.025em] sm:text-[36px]">{p.name}</h1>
          <p className="num mt-3 text-[18px]">{formatPrice(p.price, p.currency)}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge tone="muted">{p.category.name}</Badge>
            <Badge tone="muted" className="capitalize">{p.fitType} fit</Badge>
            <Badge tone="muted" className="capitalize">{p.stretch === "none" ? "No stretch" : `${p.stretch} stretch`}</Badge>
          </div>
          {p.description && <p className="mt-5 text-[15px] leading-relaxed text-ink/80">{p.description}</p>}
          {p.fabric && <p className="mt-2 text-[13.5px] text-muted">Fabric: {p.fabric}</p>}

          <div className="mt-6">
            <p className="eyebrow mb-2">Sizes offered</p>
            <ul className="flex flex-wrap gap-1.5">
              {p.sizes.map((s) => (
                <li key={s} className={cn("num grid h-10 min-w-11 place-items-center rounded-sm border px-2.5 text-[13.5px] font-semibold", s === rec?.recommendedSize ? "border-ink bg-ink text-canvas" : s === rec?.alternativeSize ? "border-ink" : "border-line-strong text-ink/80")}>
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11.5px] text-faint">Size range only — FitMatch doesn&apos;t show live stock.</p>
          </div>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            {p.externalUrl && (
              <LinkButton href={p.externalUrl} size="lg" full className="sm:w-auto">
                Shop at {p.brand.name} {rec && <>· size {rec.recommendedSize}</>} <ExternalLink className="size-4" />
              </LinkButton>
            )}
            {rec && (
              <Button variant="secondary" size="lg" onClick={() => setFeedback({ title: `${p.brand.name} — ${p.name}`, sizes: p.sizes, recommendedSize: rec.recommendedSize, productId: p.id, isBottom: ["jeans", "trousers", "shorts"].includes(p.category.slug) })}>
                <MessageSquarePlus className="size-4" /> I bought this
              </Button>
            )}
          </div>
          {p.isDemo && (
            <p className="mt-2 text-[12px] text-faint">
              {p.shopLinkIsMarket
                ? <>Demo product: opens {p.brand.name}&apos;s {marketName} store, not a specific listing.</>
                : <>{p.brand.name} has no {marketName} store on file, so this opens their main website.</>}
            </p>
          )}
        </div>
      </div>

      {/* Recommendation */}
      <section className="mt-14">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Your fit</h2>
            {data.profile && <p className="text-[13px] text-muted">For profile “{data.profile.name}”</p>}
          </div>
          {data.profile && (
            <Segmented label="Fit preference" size="sm" value={activeFit ?? "regular"} onChange={(v) => setFit(v)} options={FIT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
          )}
        </div>
        <div className={cn("transition-opacity", loading && "opacity-60")}>
          {!data.profile ? <NoProfileCallout /> : r ? <RecommendationResult result={r} unit={unit} context={`${p.brand.name} · ${p.name}`} /> : null}
        </div>
      </section>

      {/* Size chart */}
      <section className="mt-14">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Size chart</h2>
          <div className="flex flex-wrap items-center gap-2">
            {data.garment && data.chart && (
              <Segmented label="Chart type" size="sm" value={tab} onChange={setTab} options={[{ value: "garment", label: "This product" }, { value: "chart", label: "Brand chart" }]} />
            )}
            <Segmented label="Units" size="sm" value={unit} onChange={setUnit} options={[{ value: "cm", label: "cm" }, { value: "in", label: "in" }]} />
          </div>
        </div>
        {showGarment ? (
          <SizeTable garment={data.garment} unit={unit} highlight={rec?.recommendedSize} caption="Garment measurements (flat, circumferences shown in full)" />
        ) : data.chart ? (
          <SizeTable chart={data.chart} unit={unit} highlight={rec?.recommendedSize} caption={`${data.chart.name} — body measurements each size is designed for`} />
        ) : (
          <p className="rounded-md border border-dashed border-line-strong p-6 text-[14px] text-muted">No size chart or garment measurements on file for this product yet.</p>
        )}
      </section>

      {feedbackTotal > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-[22px] font-semibold tracking-[-0.02em]">How it fit others</h2>
          <div className="rounded-md border border-line bg-surface p-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-line">
              {FEEDBACK_FIT.map((f, i) => {
                const n = data.feedbackSummary[f.value] ?? 0;
                return n ? <div key={f.value} style={{ width: `${(n / feedbackTotal) * 100}%` }} className={["bg-danger", "bg-warning", "bg-success", "bg-line-strong", "bg-muted"][i]} title={`${f.label}: ${n}`} /> : null;
              })}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted">
              {FEEDBACK_FIT.map((f) => <li key={f.value}>{f.label}: <span className="num font-semibold text-ink">{data.feedbackSummary[f.value] ?? 0}</span></li>)}
            </ul>
            <p className="mt-3 text-[12px] text-faint">From {feedbackTotal} shopper{feedbackTotal > 1 ? "s" : ""}. Adjustments only apply once at least five different people report the same thing.</p>
          </div>
        </section>
      )}

      <FeedbackDialog target={feedback} onClose={() => setFeedback(null)} onSubmitted={reload} />
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
      <Skeleton className="aspect-[4/5]" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-60" />
      </div>
    </div>
  );
}
