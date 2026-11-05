"use client";

import { Button } from "@/components/ui/primitives";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Something went wrong.</h1>
        <p className="mt-2 text-[15px] text-muted">An unexpected error interrupted this page. Your data is safe.</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
