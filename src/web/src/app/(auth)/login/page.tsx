import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/app/auth-forms";

export const metadata: Metadata = { title: "Sign In" };

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
