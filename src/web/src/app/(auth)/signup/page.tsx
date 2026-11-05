import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/app/auth-forms";

export const metadata: Metadata = { title: "Create your profile" };

export default function Page() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
