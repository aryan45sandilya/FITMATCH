import type { Metadata } from "next";
import { PageIntro, Prose } from "@/components/marketing/page-intro";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <>
      <PageIntro eyebrow="Legal" title="Terms of Use" />
      <Prose>
        <h2>Recommendations are guidance</h2>
        <p>
          FitMatch provides size recommendations based on the measurements you enter and the sizing data available to us. Garments vary, and we
          can&apos;t guarantee fit. Always check the retailer&apos;s own size guide and returns policy before you buy.
        </p>
        <h2>Sizing data</h2>
        <p>Sizing data is labelled with its source and verification status. Demonstration data is approximated and must not be relied on for purchases.</p>
        <h2>Purchases</h2>
        <p>
          FitMatch doesn&apos;t sell clothing. Shopping links take you to the original retailer, where their terms apply. We don&apos;t show live stock
          or prices unless stated.
        </p>
        <h2>Brands</h2>
        <p>Brand names belong to their owners and are used for identification only. FitMatch is independent and not affiliated with or endorsed by these brands.</p>
        <h2>Your account</h2>
        <p>Keep your credentials secure. You can delete your account at any time from Settings.</p>
      </Prose>
    </>
  );
}
