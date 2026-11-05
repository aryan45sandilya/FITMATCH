import { BrandDetail } from "@/components/app/brand-views";

export default async function AppBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BrandDetail slug={slug} backHref="/app/brands" findHref={`/app/find?brand=${slug}`} />;
}
