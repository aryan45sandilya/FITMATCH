import { BrandDetail } from "@/components/app/brand-views";

export default async function PublicBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BrandDetail slug={slug} backHref="/brands" findHref="/signup" />;
}
