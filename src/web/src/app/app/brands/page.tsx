import { BrandDirectory } from "@/components/app/brand-views";
import { PageHeader } from "@/components/ui/primitives";

export default function AppBrandsPage() {
  return (
    <>
      <PageHeader eyebrow="Explore brands" title="Brands & their size charts" description="Each brand's sizing data, where it came from, and whether it has been verified." />
      <BrandDirectory basePath="/app/brands" />
    </>
  );
}
