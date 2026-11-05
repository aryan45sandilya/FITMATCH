"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { FEEDBACK_FIT } from "@/lib/labels";
import { Button, Field, Notice, Select, Textarea, cn } from "../ui/primitives";
import { useToast } from "../ui/toast";

export interface FeedbackTarget {
  title: string;
  sizes: string[];
  recommendedSize?: string | null;
  productId?: string | null;
  recommendationId?: string | null;
  isBottom?: boolean;
}

function Choice<T extends string>({ name, value, onChange, options }: { name: string; value: T | null; onChange: (v: T) => void; options: readonly { value: T; label: string }[] }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("h-10 rounded-sm border px-3.5 text-[13px] font-medium transition-colors", value === o.value ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface hover:border-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FeedbackDialog({ target, onClose, onSubmitted }: { target: FeedbackTarget | null; onClose: () => void; onSubmitted?: () => void }) {
  const toast = useToast();
  const [size, setSize] = useState("");
  const [overall, setOverall] = useState<(typeof FEEDBACK_FIT)[number]["value"] | null>(null);
  const [length, setLength] = useState<"too_short" | "right" | "too_long" | null>(null);
  const [shoulder, setShoulder] = useState<"tight" | "comfortable" | "loose" | "not_applicable" | null>(null);
  const [again, setAgain] = useState<"yes" | "no" | null>(null);
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!target) return;
    setSize(target.recommendedSize ?? target.sizes[0] ?? "");
    setOverall(null);
    setLength(null);
    setShoulder(target.isBottom ? "not_applicable" : null);
    setAgain(null);
    setComments("");
    setError(undefined);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  const complete = size && overall && length && shoulder && again;

  async function submit() {
    if (!target || !complete) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.post("/me/feedback", {
        productId: target.productId ?? undefined,
        recommendationId: target.recommendationId ?? undefined,
        purchasedSize: size,
        overallFit: overall,
        lengthFit: length,
        shoulderFit: shoulder,
        wouldBuySameSize: again === "yes",
        comments: comments.trim() || undefined,
      });
      toast("Thanks — your next recommendation will use this");
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save feedback.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {target && (
        <div className="fixed inset-0 z-[55] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div className="absolute inset-0 bg-night/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fb-title"
            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-lg bg-surface sm:rounded-md"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 id="fb-title" className="text-[17px] font-semibold tracking-[-0.01em]">How did it fit?</h2>
                <p className="truncate text-[13px] text-muted">{target.title}</p>
              </div>
              <button type="button" onClick={onClose} className="-mr-2 grid size-9 shrink-0 place-items-center rounded-sm text-muted hover:text-ink" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <Field label="Size you bought or tried" htmlFor="fb-size" hint={target.recommendedSize ? `We recommended ${target.recommendedSize}.` : undefined}>
                <Select id="fb-size" value={size} onChange={(e) => setSize(e.target.value)}>
                  {target.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <fieldset>
                <legend className="mb-2 text-[13px] font-semibold">Was it too tight or too loose?</legend>
                <Choice name="Overall fit" value={overall} onChange={setOverall} options={FEEDBACK_FIT} />
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-[13px] font-semibold">Was the length correct?</legend>
                <Choice name="Length" value={length} onChange={setLength} options={[{ value: "too_short", label: "Too short" }, { value: "right", label: "Just right" }, { value: "too_long", label: "Too long" }] as const} />
              </fieldset>
              {!target.isBottom && (
                <fieldset>
                  <legend className="mb-2 text-[13px] font-semibold">Were the shoulders comfortable?</legend>
                  <Choice name="Shoulders" value={shoulder} onChange={setShoulder} options={[{ value: "tight", label: "Tight" }, { value: "comfortable", label: "Comfortable" }, { value: "loose", label: "Loose" }] as const} />
                </fieldset>
              )}
              <fieldset>
                <legend className="mb-2 text-[13px] font-semibold">Would you buy the same size again?</legend>
                <Choice name="Buy again" value={again} onChange={setAgain} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] as const} />
              </fieldset>
              <Field label="Anything else?" htmlFor="fb-c" optional>
                <Textarea id="fb-c" maxLength={1000} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="e.g. sleeves ran long, fabric loosened after washing" />
              </Field>
              <p className="text-[12px] leading-relaxed text-faint">Your feedback personalises your own future recommendations. It only affects others once several different shoppers report the same fit.</p>
              {error && <Notice tone="danger">{error}</Notice>}
            </div>
            <div className="border-t border-line px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              <Button full size="lg" onClick={submit} disabled={!complete} loading={busy}>Submit feedback</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
