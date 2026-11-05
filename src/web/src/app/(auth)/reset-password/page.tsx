import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "@/components/app/auth-forms";

export const metadata: Metadata = { title: "New password" };

export default function Page() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
