import type { Metadata } from "next";
import { PageIntro, Prose } from "@/components/marketing/page-intro";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <PageIntro eyebrow="Contact" title="Talk to us." lede="Questions about your account, sizing data, or partnering with FitMatch." />
      <Prose>
        <p>FitMatch is in early development and doesn&apos;t have a staffed support inbox yet. Add your team&apos;s contact address here before launch.</p>
        <h2>Brands and retailers</h2>
        <p>
          If you represent a brand and want your size charts or garment measurements verified on FitMatch, we&apos;d like to hear from you. Verified
          data is labelled as official throughout the product.
        </p>
      </Prose>
    </>
  );
}
