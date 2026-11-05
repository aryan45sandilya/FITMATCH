import type { Metadata } from "next";
import { BrandDirectory } from "@/components/app/brand-views";
import { PageIntro } from "@/components/marketing/page-intro";

export const metadata: Metadata = { title: "Explore Brands" };

export default function BrandsPage() {
  return (
    <>
      <PageIntro eyebrow="Explore brands" title="Every brand sizes differently." lede="Browse the size data FitMatch holds for each brand. Every chart shows where its numbers came from and whether they have been verified." />
      <BrandDirectory basePath="/brands" />
    </>
  );
}
