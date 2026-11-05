"use client";

import { useState } from "react";
import { Badge, Button, EmptyState, ErrorState, PageHeader, Segmented, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, qs } from "@/lib/api";
import { FEEDBACK_FIT, relativeTime } from "@/lib/labels";
import { useApi } from "@/lib/use-api";

interface Row {
  id: string; purchased_size: string; recommended_size: string | null; overall_fit: string; length_fit: string; shoulder_fit: string;
  would_buy_same_size: boolean; comments: string | null; moderation_status: "active" | "flagged" | "excluded"; created_at: string;
  brand_name: string; category_name: string; product_name: string | null; user_hint: string;
}

export default function FeedbackAdmin() {
  const [status, setStatus] = useState<"all" | Row["moderation_status"]>("all");
  const { data, error, loading, reload, setData } = useApi<{ feedback: Row[] }>(`/admin/feedback${qs({ status: status === "all" ? undefined : status })}`);
  const toast = useToast();

  async function moderate(id: string, moderationStatus: Row["moderation_status"]) {
    await api.patch(`/admin/feedback/${id}`, { moderationStatus });
    setData((d) => (d ? { feedback: d.feedback.map((f) => (f.id === id ? { ...f, moderation_status: moderationStatus } : f)) } : d));
    toast(moderationStatus === "excluded" ? "Excluded from aggregates" : moderationStatus === "flagged" ? "Flagged for review" : "Restored");
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Fit feedback" description="Excluded feedback no longer counts toward product-level adjustments or performance metrics. The user's own personal adjustment is unaffected." />
      <Segmented label="Filter" value={status} onChange={setStatus} className="mb-4" options={[{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "flagged", label: "Flagged" }, { value: "excluded", label: "Excluded" }]} />
      {error ? <ErrorState message={error.message} onRetry={reload} /> : loading ? <Skeleton className="h-96" /> : !data?.feedback.length ? (
        <EmptyState title="No feedback here" body="Feedback appears once users report how a size fit." />
      ) : (
        <ul className="space-y-3">
          {data.feedback.map((f) => (
            <li key={f.id} className="grid gap-4 rounded-md border border-line bg-surface p-5 md:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{f.product_name ?? `${f.brand_name} ${f.category_name}`}</p>
                  <Badge tone={f.moderation_status === "active" ? "success" : f.moderation_status === "flagged" ? "warning" : "muted"}>{f.moderation_status}</Badge>
                </div>
                <p className="mt-0.5 text-[12.5px] text-muted">{f.brand_name} · {f.user_hint} · {relativeTime(f.created_at)}</p>
                <p className="mt-2 text-[13px]">
                  Bought <b className="num">{f.purchased_size}</b> (recommended <b className="num">{f.recommended_size ?? "—"}</b>) · {FEEDBACK_FIT.find((x) => x.value === f.overall_fit)?.label} · length {f.length_fit.replace("_", " ")} · shoulders {f.shoulder_fit.replace("_", " ")} · {f.would_buy_same_size ? "would buy same size" : "would change size"}
                </p>
                {f.comments && <p className="mt-2 text-[13px] text-ink/75">“{f.comments}”</p>}
              </div>
              <div className="flex gap-2 md:flex-col">
                {f.moderation_status !== "active" && <Button size="sm" variant="secondary" onClick={() => moderate(f.id, "active")}>Restore</Button>}
                {f.moderation_status === "active" && <Button size="sm" variant="secondary" onClick={() => moderate(f.id, "flagged")}>Flag</Button>}
                {f.moderation_status !== "excluded" && <Button size="sm" variant="danger" onClick={() => moderate(f.id, "excluded")}>Exclude</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
