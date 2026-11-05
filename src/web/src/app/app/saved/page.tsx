"use client";

import { Bookmark } from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "@/components/app/product";
import { EmptyState, ErrorState, LinkButton, PageHeader } from "@/components/ui/primitives";
import type { Product } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export default function SavedPage() {
  const { data, error, loading, reload, setData } = useApi<{ products: Product[] }>("/me/saved");
  return (
    <>
      <PageHeader eyebrow="Saved products" title="Your shortlist." description="Saved pieces keep their recommended size up to date as your measurements change." />
      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
      ) : !data?.products.length ? (
        <EmptyState icon={<Bookmark className="size-5" />} title="Nothing saved yet" body="Tap the bookmark on any product to keep it here with your size." action={<LinkButton href="/app/discover" size="sm">Discover products</LinkButton>} />
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {data.products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} onSavedChange={(v) => !v && setData((d) => (d ? { products: d.products.filter((x) => x.id !== p.id) } : d))} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
