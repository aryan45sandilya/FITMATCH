import type { Metadata } from "next";
import { MeasurementGuide } from "@/components/app/measurement-guide";
import { PageIntro } from "@/components/marketing/page-intro";

export const metadata: Metadata = { title: "Size Guide" };

export default function SizeGuidePage() {
  return (
    <>
      <PageIntro
        eyebrow="Size guide"
        title="How to measure yourself, properly."
        lede="Twelve measurement points, each with a diagram and step-by-step instructions. Select a point to see exactly where the tape goes."
      />
      <MeasurementGuide />
    </>
  );
}
