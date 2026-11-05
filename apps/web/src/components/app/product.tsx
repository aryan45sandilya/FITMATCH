"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { MEASUREMENT_LABEL, QUALITY } from "@/lib/labels";
import type { Product, RecommendationSummary } from "@/lib/types";
import { formatPrice } from "@/lib/units";
import { DemoDataBadge } from "../brand";
import { GarmentIllustration } from "../illustrations/garment";
import { cn } from "../ui/primitives";
import { useToast } from "../ui/toast";

export function ProductImage({ product, className, sizes = "(min-width: 1024px) 25vw, 50vw", priority }: { product: Pick<Product, "imageUrls" | "colorway" | "name"> & { category: { slug: string } }; className?: string; sizes?: string; priority?: boolean }) {
  const url = product.imageUrls[0];
  return (
    <div className={cn("relative overflow-hidden bg-tile", className)}>
      {url ? (
        url.includes("res.cloudinary.com") ? (
          <Image src={url} alt={product.name} fill sizes={sizes} className="object-cover" priority={priority} />
        ) : (
          // Arbitrary admin-provided https images: not optimised by Next.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={product.name} loading={priority ? "eager" : "lazy"} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        )
      ) : (
        <div className="absolute inset-[14%]">
          <GarmentIllustration category={product.category.slug} colorway={product.colorway} label={`Illustration of ${product.name}`} />
        </div>
      )}
    </div>
  );
}

export function RecPill({ rec, compact }: { rec?: RecommendationSummary | null; compact?: boolean }) {
  if (!rec) return null;
  if (rec.status === "ok" && rec.recommendedSize) {
    const q = QUALITY[rec.matchQuality!];
    return (
      <div className="flex items-center gap-2">
        <span className="num grid h-7 min-w-9 place-items-center rounded-xs bg-ink px-2 text-[13px] font-semibold text-canvas">{rec.recommendedSize}</span>
        {!compact && (
          <span className={cn("text-[12px] font-semibold", q.tone === "success" ? "text-success" : q.tone === "warning" ? "text-warning-text" : "text-danger")}>{q.label}</span>
        )}
      </div>
    );
  }
  if (rec.status === "missing_measurements") {
    return <span className="text-[12px] font-medium text-accent">Add {rec.missing?.map((k) => MEASUREMENT_LABEL[k].toLowerCase()).join(", ")}</span>;
  }
  return <span className="text-[12px] text-faint">Not enough sizing data</span>;
}

export function SaveButton({ productId, saved, onChange, className }: { productId: string; saved: boolean; onChange?: (v: boolean) => void; className?: string }) {
  const [on, setOn] = useState(saved);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !on;
    setOn(next);
    try {
      if (next) await api.put(`/me/saved/${productId}`);
      else await api.del(`/me/saved/${productId}`);
      onChange?.(next);
      toast(next ? "Saved" : "Removed from saved", "info");
    } catch {
      setOn(!next);
      toast("Couldn't update saved products", "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Remove from saved" : "Save product"}
      className={cn("grid size-9 place-items-center rounded-full bg-surface/90 text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] backdrop-blur transition-transform hover:scale-105", className)}
    >
      {on ? <BookmarkCheck className="size-4 text-accent" /> : <Bookmark className="size-4" />}
    </button>
  );
}

export function ProductCard({ product, onSavedChange }: { product: Product; onSavedChange?: (v: boolean) => void }) {
  return (
    <article className="group relative flex flex-col">
      <Link href={`/app/products/${product.slug}`} className="flex flex-1 flex-col" aria-label={`${product.brand.name} ${product.name}`}>
        <ProductImage product={product} className="aspect-[4/5] rounded-sm transition-[filter] duration-300 group-hover:brightness-[0.97]" />
        <div className="flex flex-1 flex-col pt-3">
          <p className="text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">{product.brand.name}</p>
          <h3 className="mt-0.5 line-clamp-2 text-[14.5px] leading-snug font-semibold text-ink">{product.name}</h3>
          <div className="mt-1 flex items-center gap-2 text-[12.5px] text-muted">
            <span className="num">{formatPrice(product.price, product.currency)}</span>
            <span aria-hidden>·</span>
            <span className="capitalize">{product.fitType} fit</span>
          </div>
          <p className="num mt-1 truncate text-[12px] text-faint">{product.sizes.join(" · ")}</p>
          <div className="mt-auto flex min-h-10 items-end pt-3">
            {product.recommendation ? <RecPill rec={product.recommendation} /> : <span className="text-[12px] text-faint">Add measurements for a size</span>}
          </div>
        </div>
      </Link>
      <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5">
        <SaveButton productId={product.id} saved={Boolean(product.isSaved)} onChange={onSavedChange} />
      </div>
      {product.isDemo && <DemoDataBadge className="absolute top-3 left-3" />}
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/5]" />
      <div className="skeleton mt-3 h-3 w-16" />
      <div className="skeleton mt-2 h-4 w-3/4" />
      <div className="skeleton mt-2 h-3 w-1/2" />
      <div className="skeleton mt-4 h-7 w-24" />
    </div>
  );
}
