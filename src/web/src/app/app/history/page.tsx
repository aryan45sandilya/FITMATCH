"use client";

import { Check, History, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FeedbackDialog, type FeedbackTarget } from "@/components/app/feedback-form";
import { QualityText } from "@/components/app/recommendation";
import { Badge, Button, EmptyState, ErrorState, LinkButton, PageHeader, Segmented, Skeleton } from "@/components/ui/primitives";
import { FEEDBACK_FIT, relativeTime } from "@/lib/labels";
import { useApi } from "@/lib/use-api";

interface Rec {
  id: string; status: string; recommended_size: string | null; alternative_size: string | null; match_quality: string | null; confidence: string | null;
  fit_preference: string; created_at: string; brand_name: string; brand_slug: string; category_name: string; category_slug: string;
  product_id: string | null; product_name: string | null; product_slug: string | null; sizes: string[] | null; has_feedback: boolean;
}
interface Feedback {
  id: string; purchased_size: string; recommended_size: string | null; overall_fit: string; length_fit: string; shoulder_fit: string;
  would_buy_same_size: boolean; comments: string | null; created_at: string; brand_name: string; category_name: string; product_name: string | null; product_slug: string | null;
}

export default function HistoryPage() {
  const [tab, setTab] = useState<"recs" | "feedback">("recs");
  const recs = useApi<{ recommendations: Rec[] }>("/me/recommendations");
  const fb = useApi<{ feedback: Feedback[] }>("/me/feedback");
  const [target, setTarget] = useState<FeedbackTarget | null>(null);

  const LETTERS = ["XS", "S", "M", "L", "XL", "XXL"];
  const sizesFor = (r: Rec) => r.sizes ?? (r.recommended_size && LETTERS.includes(r.recommended_size) ? LETTERS : [r.recommended_size, r.alternative_size].filter((x): x is string => Boolean(x)));

  return (
    <>
      <PageHeader
        eyebrow="Fit history"
        title="Every size we've suggested."
        description="Tell us how things actually fit. Your feedback adjusts future recommendations for the same brand and category."
        actions={<Segmented label="View" value={tab} onChange={setTab} options={[{ value: "recs", label: "Recommendations" }, { value: "feedback", label: "My feedback" }]} />}
      />

      {tab === "recs" ? (
        recs.error ? <ErrorState message={recs.error.message} onRetry={recs.reload} /> : recs.loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : !recs.data?.recommendations.length ? (
          <EmptyState icon={<History className="size-5" />} title="No recommendations yet" body="Your size checks will show up here." action={<LinkButton href="/app/find" size="sm">Find my size</LinkButton>} />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
            {recs.data.recommendations.map((r) => (
              <li key={r.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6 sm:px-5">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="num grid size-12 shrink-0 place-items-center rounded-sm bg-ink text-[16px] font-semibold text-canvas">{r.recommended_size ?? "—"}</span>
                  <div className="min-w-0">
                    {r.product_slug ? (
                      <Link href={`/app/products/${r.product_slug}`} className="block truncate text-[15px] font-semibold hover:underline">{r.product_name}</Link>
                    ) : (
                      <p className="truncate text-[15px] font-semibold">{r.category_name} — general fit</p>
                    )}
                    <p className="text-[12.5px] text-muted">
                      {r.brand_name} · {r.category_name} · <span className="capitalize">{r.fit_preference}</span> · {relativeTime(r.created_at)}
                    </p>
                    <div className="mt-1">{r.status === "ok" ? <QualityText quality={r.match_quality ?? undefined} /> : <span className="text-[12.5px] text-faint">Insufficient sizing data</span>}</div>
                  </div>
                </div>
                {r.status === "ok" && (
                  r.has_feedback ? (
                    <Badge tone="success"><Check className="size-3" /> Feedback given</Badge>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setTarget({ title: r.product_name ? `${r.brand_name} — ${r.product_name}` : `${r.brand_name} ${r.category_name}`, sizes: sizesFor(r), recommendedSize: r.recommended_size, productId: r.product_id, recommendationId: r.id, isBottom: ["jeans", "trousers", "shorts"].includes(r.category_slug) })}>
                      <MessageSquarePlus className="size-4" /> How did it fit?
                    </Button>
                  )
                )}
              </li>
            ))}
          </ul>
        )
      ) : fb.error ? (
        <ErrorState message={fb.error.message} onRetry={fb.reload} />
      ) : fb.loading ? (
        <Skeleton className="h-60" />
      ) : !fb.data?.feedback.length ? (
        <EmptyState title="No feedback yet" body="After you buy or try something, tell us how it fit from the Recommendations tab." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {fb.data.feedback.map((f) => (
            <li key={f.id} className="rounded-md border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{f.product_name ?? `${f.brand_name} ${f.category_name}`}</p>
                  <p className="text-[12.5px] text-muted">{f.brand_name} · {relativeTime(f.created_at)}</p>
                </div>
                <Badge tone={f.overall_fit === "just_right" ? "success" : "warning"}>{FEEDBACK_FIT.find((x) => x.value === f.overall_fit)?.label}</Badge>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3 text-[12.5px]">
                <div><dt className="text-muted">Bought</dt><dd className="num font-semibold">{f.purchased_size}</dd></div>
                <div><dt className="text-muted">We said</dt><dd className="num font-semibold">{f.recommended_size ?? "—"}</dd></div>
                <div><dt className="text-muted">Again?</dt><dd className="font-semibold">{f.would_buy_same_size ? "Same size" : "Different"}</dd></div>
                <div><dt className="text-muted">Length</dt><dd className="font-semibold capitalize">{f.length_fit.replace("_", " ")}</dd></div>
                <div><dt className="text-muted">Shoulders</dt><dd className="font-semibold capitalize">{f.shoulder_fit === "not_applicable" ? "—" : f.shoulder_fit}</dd></div>
              </dl>
              {f.comments && <p className="mt-3 text-[13px] leading-relaxed text-ink/80">“{f.comments}”</p>}
            </li>
          ))}
        </ul>
      )}

      <FeedbackDialog target={target} onClose={() => setTarget(null)} onSubmitted={() => { void recs.reload(); void fb.reload(); }} />
    </>
  );
}
