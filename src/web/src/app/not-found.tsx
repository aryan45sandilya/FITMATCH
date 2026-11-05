import { LinkButton } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="num font-serif text-[96px] leading-none text-accent italic">404</p>
        <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.02em]">This page doesn&apos;t fit.</h1>
        <p className="mt-2 text-[15px] text-muted">The page you&apos;re looking for has moved or never existed.</p>
        <LinkButton href="/" className="mt-8">Back to FitMatch</LinkButton>
      </div>
    </main>
  );
}
