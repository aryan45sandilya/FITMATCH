import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="mx-auto min-h-[60vh] max-w-[1320px] px-4 pt-10 pb-24 sm:px-6 md:pt-16 lg:px-10">{children}</main>
      <SiteFooter />
    </>
  );
}
