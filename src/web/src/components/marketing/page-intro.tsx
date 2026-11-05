export function PageIntro({ eyebrow, title, lede }: { eyebrow: string; title: React.ReactNode; lede?: React.ReactNode }) {
  return (
    <header className="mb-12 max-w-3xl md:mb-16">
      <p className="eyebrow mb-4 flex items-center gap-3">
        <span className="h-px w-8 bg-accent" aria-hidden /> {eyebrow}
      </p>
      <h1 className="font-serif text-[38px] leading-[1.05] tracking-[-0.025em] sm:text-[54px]">{title}</h1>
      {lede && <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-muted">{lede}</p>}
    </header>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl space-y-5 text-[15.5px] leading-[1.75] text-ink/85 [&_h2]:mt-10 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:tracking-[-0.015em] [&_h2]:text-ink [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
      {children}
    </div>
  );
}
