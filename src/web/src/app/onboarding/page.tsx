import type { Metadata } from "next";
import { Suspense } from "react";
import { MeasurementWizard } from "@/components/app/measurement-wizard";

export const metadata: Metadata = { title: "Your measurements" };

export default function OnboardingPage() {
  return (
    <Suspense>
      <MeasurementWizard />
    </Suspense>
  );
}
