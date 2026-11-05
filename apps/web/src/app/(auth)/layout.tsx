import { Logo } from "@/components/brand";
import { BodyDiagram } from "@/components/illustrations/body-diagram";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-night p-10 text-paper lg:flex lg:flex-col">
        <Logo inverse />
        <div className="pointer-events-none absolute inset-y-0 right-[-8%] w-[70%] opacity-[0.16] on-night">
          <BodyDiagram compact values={{ chest: 100, waist: 84, hip: 100, shoulder: 45, inseam: 80, neck: 39, sleeve: 85, thigh: 58 }} />
        </div>
        <div className="relative mt-auto max-w-md">
          <p className="font-serif text-[34px] leading-[1.15] tracking-[-0.02em]">
            &ldquo;A medium is a label. <em className="text-accent">Your chest is a number.</em>&rdquo;
          </p>
          <p className="mt-5 text-[14px] leading-relaxed text-[#a9a69e]">One measurement profile, translated into the right size for every brand you shop.</p>
        </div>
      </aside>
      <main className="flex flex-col px-4 py-6 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
