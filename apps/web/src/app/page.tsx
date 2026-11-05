import { ArrowRight, ArrowUpRight, History, Layers, Ruler, ScanLine, SlidersHorizontal, Target } from "lucide-react";
import Link from "next/link";
import { HeroVisual } from "@/components/illustrations/hero-visual";
import { BodyDiagram } from "@/components/illustrations/body-diagram";
import { GarmentIllustration } from "@/components/illustrations/garment";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { LinkButton } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";

const BRANDS = ["H&M", "Zara", "U.S. Polo Assn.", "Uniqlo", "Levi's", "Tommy Hilfiger", "Nike", "Adidas", "Mango", "COS"];

const problems = [
  { n: "01", title: "Every brand follows different sizing standards.", body: "A medium is a label, not a measurement. Two brands can grade the same size several centimetres apart at the chest." },
  { n: "02", title: "Size labels don't guarantee the same fit.", body: "Cut, fabric and stretch change how a size wears. A slim oxford and a boxy tee in “M” fit nothing alike." },
  { n: "03", title: "Returns waste time and money.", body: "Ordering two sizes to send one back costs you shipping, waiting, and the item you actually wanted." },
];

const features = [
  { icon: Ruler, title: "Universal Measurement Profile", body: "Twelve body measurements, stored once in centimetres and shown in the units you prefer." },
  { icon: Layers, title: "Cross-Brand Size Comparison", body: "See your size side by side across brands for any category, with the measurement differences behind it." },
  { icon: Target, title: "Product-Level Fit Prediction", body: "When garment measurements exist, we compare the finished piece — not just the brand's chart." },
  { icon: History, title: "Personal Fit History", body: "Every recommendation and every “too tight” note, kept so the next one gets better." },
  { icon: SlidersHorizontal, title: "Fit Preference Customization", body: "Slim, regular, relaxed or oversized — globally or per category. The target shifts with you." },
  { icon: ScanLine, title: "Measurement Assistance", body: "Step-by-step guidance and diagrams for every point, with validation that catches typos before they cost you." },
];

const compareRows = [
  { brand: "H&M", size: "M", fit: "Good match", delta: "Chest within range" },
  { brand: "Zara", size: "L", fit: "Good match", delta: "Chest +1.0 cm vs. M" },
  { brand: "U.S. Polo Assn.", size: "M", fit: "Excellent match", delta: "Chest & waist within" },
  { brand: "Uniqlo", size: "L", fit: "Good match", delta: "Compact grading" },
  { brand: "Levi's", size: "32", fit: "Excellent match", delta: "Waist 82 cm" },
];

export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <main>
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-[1320px] gap-10 px-4 pt-8 pb-16 sm:px-6 md:pt-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:px-10 lg:pt-16 lg:pb-24">
          <div>
            <Reveal>
              <p className="eyebrow mb-6 flex items-center gap-3">
                <span className="h-px w-8 bg-accent" aria-hidden /> Size intelligence for menswear & beyond
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="font-serif text-[44px] leading-[1.02] font-medium tracking-[-0.025em] text-ink sm:text-[60px] lg:text-[76px]">
                Your Size. <br className="hidden sm:block" />
                Every Brand. <br />
                <em className="text-accent">Zero Guesswork.</em>
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-7 max-w-[520px] text-[16px] leading-[1.65] text-muted sm:text-[17px]">
                Your body doesn&apos;t change between brands. Your clothing size shouldn&apos;t be a guessing game. Create your measurement profile and discover your perfect fit across the brands you love.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/signup" size="lg" className="sm:w-auto" full>
                  Find My Size <ArrowRight className="size-4" />
                </LinkButton>
                <LinkButton href="/brands" variant="secondary" size="lg" className="sm:w-auto" full>
                  Explore Brands
                </LinkButton>
              </div>
            </Reveal>
            <Reveal delay={0.24}>
              <dl className="mt-12 grid max-w-[520px] grid-cols-3 border-t border-line pt-6">
                {[
                  ["12", "body points"],
                  ["10", "brands"],
                  ["9", "categories"],
                ].map(([n, l]) => (
                  <div key={l}>
                    <dt className="sr-only">{l}</dt>
                    <dd className="num text-[26px] font-semibold tracking-[-0.02em]">{n}</dd>
                    <dd className="text-[12.5px] text-muted">{l}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
          <Reveal y={10}>
            <HeroVisual />
          </Reveal>
        </section>

        {/* ── Brand strip ──────────────────────────────────── */}
        <section aria-label="Supported brands" className="border-y border-line bg-surface">
          <div className="relative mx-auto max-w-[1320px] overflow-hidden">
            <div className="scrollbar-none flex gap-12 overflow-x-auto px-4 py-6 sm:px-6 lg:justify-between lg:px-10">
              {BRANDS.map((b) => (
                <span key={b} className="shrink-0 text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap text-[#9a968d]">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Problem ──────────────────────────────────────── */}
        <section className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6 md:py-28 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
            <Reveal>
              <p className="eyebrow mb-4">The problem</p>
              <h2 className="font-serif text-[34px] leading-[1.1] tracking-[-0.02em] sm:text-[44px]">Why is finding your size so complicated?</h2>
            </Reveal>
            <div className="divide-y divide-line border-y border-line">
              {problems.map((p, i) => (
                <Reveal key={p.n} delay={i * 0.06}>
                  <article className="grid gap-3 py-7 sm:grid-cols-[64px_1fr] sm:gap-6">
                    <span className="num text-[13px] font-semibold text-accent">{p.n}</span>
                    <div>
                      <h3 className="text-[19px] font-semibold tracking-[-0.015em]">{p.title}</h3>
                      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">{p.body}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────── */}
        <section id="how-it-works" className="scroll-mt-20 bg-surface">
          <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6 md:py-28 lg:px-10">
            <Reveal>
              <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div>
                  <p className="eyebrow mb-4">How FitMatch works</p>
                  <h2 className="max-w-xl font-serif text-[34px] leading-[1.1] tracking-[-0.02em] sm:text-[44px]">Three steps from tape measure to the right size.</h2>
                </div>
                <p className="max-w-sm text-[15px] leading-relaxed text-muted">Takes about five minutes the first time. After that, every brand is one tap away.</p>
              </div>
            </Reveal>
            <ol className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3">
              <Reveal className="bg-surface">
                <li className="flex h-full flex-col p-6 sm:p-8">
                  <span className="num text-[12px] font-semibold text-accent">STEP 01</span>
                  <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.015em]">Create your body profile</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-muted">Guided measurements with diagrams. Skip anything you don&apos;t need.</p>
                  <div className="mt-8 aspect-[4/3] overflow-hidden rounded-sm bg-canvas">
                    <BodyDiagram compact focus="chest" values={{ chest: 100, waist: 84, hip: 100, shoulder: 45.5, inseam: 80 }} visible={["shoulder", "chest", "waist", "hip", "inseam"]} />
                  </div>
                </li>
              </Reveal>
              <Reveal className="bg-surface" delay={0.06}>
                <li className="flex h-full flex-col p-6 sm:p-8">
                  <span className="num text-[12px] font-semibold text-accent">STEP 02</span>
                  <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.015em]">Choose a brand and product</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-muted">Pick a category, a brand, then the exact piece you&apos;re considering.</p>
                  <div className="mt-8 grid aspect-[4/3] grid-cols-3 gap-2 rounded-sm bg-canvas p-3">
                    {[
                      ["t-shirts", "#E9E4DA"],
                      ["jeans", "#4A5868"],
                      ["shirts", "#C9D2D9"],
                      ["polo-t-shirts", "#22324A"],
                      ["hoodies", "#8C8577"],
                      ["jackets", "#7C93AE"],
                    ].map(([c, color], i) => (
                      <div key={c} className={`grid place-items-center rounded-xs bg-surface p-1.5 ${i === 1 ? "ring-1 ring-ink" : ""}`}>
                        <GarmentIllustration category={c!} colorway={color} />
                      </div>
                    ))}
                  </div>
                </li>
              </Reveal>
              <Reveal className="bg-surface" delay={0.12}>
                <li className="flex h-full flex-col p-6 sm:p-8">
                  <span className="num text-[12px] font-semibold text-accent">STEP 03</span>
                  <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.015em]">Get your recommendation</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-muted">A size, an alternative, and exactly why — measurement by measurement.</p>
                  <div className="mt-8 flex aspect-[4/3] flex-col justify-between rounded-sm bg-night p-5 text-canvas">
                    <div className="flex items-start justify-between">
                      <span className="text-[11px] tracking-[0.14em] text-[#a9a69e] uppercase">Levi&apos;s · Straight jean</span>
                      <span className="rounded-xs bg-success/25 px-1.5 py-0.5 text-[10.5px] text-[#a9cdb3]">Excellent</span>
                    </div>
                    <div className="num font-serif text-[64px] leading-none">32</div>
                    <div className="space-y-1.5 text-[11.5px]">
                      {[["Waist", "Within range"], ["Hips", "Within range"], ["Inseam", "+1 cm"]].map(([k, v]) => (
                        <div key={k} className="flex justify-between border-t border-white/10 pt-1.5"><span className="text-[#a9a69e]">{k}</span><span>{v}</span></div>
                      ))}
                    </div>
                  </div>
                </li>
              </Reveal>
            </ol>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <section className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6 md:py-28 lg:px-10">
          <Reveal>
            <p className="eyebrow mb-4">What you get</p>
            <h2 className="max-w-2xl font-serif text-[34px] leading-[1.1] tracking-[-0.02em] sm:text-[44px]">Built around your measurements, not a label.</h2>
          </Reveal>
          <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.06}>
                <div className="border-t border-ink pt-5">
                  <f.icon className="size-5 text-accent" strokeWidth={1.6} aria-hidden />
                  <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">{f.title}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Comparison preview (dark) ────────────────────── */}
        <section className="bg-night text-canvas">
          <div className="mx-auto grid max-w-[1320px] gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1fr_1.3fr] lg:gap-20 lg:px-10">
            <Reveal>
              <p className="mb-4 text-[11px] font-semibold tracking-[0.16em] text-[#8a877f] uppercase">Cross-brand comparison</p>
              <h2 className="font-serif text-[34px] leading-[1.1] tracking-[-0.02em] sm:text-[44px]">&ldquo;I wear a medium. What do I buy everywhere else?&rdquo;</h2>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#b4b1a9]">
                Compare one category across every brand in a single view, sorted by how well each fits you — with the centimetres that explain every answer.
              </p>
              <LinkButton href="/signup" variant="inverse" size="lg" className="mt-9">
                Compare my sizes <ArrowUpRight className="size-4" />
              </LinkButton>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="overflow-hidden rounded-md border border-white/10">
                <div className="grid grid-cols-[1.3fr_0.6fr_1fr] gap-4 border-b border-white/10 bg-night-2 px-5 py-3 text-[11px] font-semibold tracking-[0.12em] text-[#8a877f] uppercase sm:grid-cols-[1.3fr_0.6fr_1fr_1.2fr]">
                  <span>Brand</span>
                  <span>Size</span>
                  <span>Assessment</span>
                  <span className="hidden sm:block">Why</span>
                </div>
                {compareRows.map((r) => (
                  <div key={r.brand} className="grid grid-cols-[1.3fr_0.6fr_1fr] items-center gap-4 border-b border-white/5 px-5 py-4 text-[14px] last:border-0 sm:grid-cols-[1.3fr_0.6fr_1fr_1.2fr]">
                    <span className="truncate font-semibold">{r.brand}</span>
                    <span className="num text-[18px] font-semibold">{r.size}</span>
                    <span className="text-[13px] text-[#a9cdb3]">{r.fit}</span>
                    <span className="hidden text-[13px] text-[#8a877f] sm:block">{r.delta}</span>
                  </div>
                ))}
                <p className="bg-night-2 px-5 py-3 text-[11.5px] text-[#8a877f]">Illustrative values. In the app, results are calculated from stored size data and labelled with its verification status.</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Brand grid ───────────────────────────────────── */}
        <section className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6 md:py-28 lg:px-10">
          <Reveal>
            <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="eyebrow mb-4">Supported brands</p>
                <h2 className="font-serif text-[34px] leading-[1.1] tracking-[-0.02em] sm:text-[44px]">Ten brands today. More every season.</h2>
              </div>
              <Link href="/brands" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink underline-offset-4 hover:underline">
                See every brand <ArrowRight className="size-4" />
              </Link>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
            {BRANDS.map((b, i) => (
              <Reveal key={b} delay={(i % 5) * 0.04} className="bg-surface">
                <Link href="/brands" className="group flex aspect-[5/3] items-center justify-center p-4 transition-colors hover:bg-canvas">
                  <span className="text-center text-[17px] font-bold tracking-[-0.02em] text-[#6f6b63] transition-colors group-hover:text-ink sm:text-[19px]">{b}</span>
                </Link>
              </Reveal>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-faint">Brand names are shown typographically for identification. FitMatch is independent and not affiliated with these brands.</p>
        </section>

        {/* ── Final CTA ────────────────────────────────────── */}
        <section className="border-t border-line bg-[#EFECE5]">
          <div className="mx-auto flex max-w-[1320px] flex-col items-start gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-end md:justify-between md:py-24 lg:px-10">
            <Reveal>
              <h2 className="font-serif text-[44px] leading-[1.02] tracking-[-0.025em] sm:text-[64px]">
                Stop guessing. <br />
                <em className="text-accent">Start fitting.</em>
              </h2>
            </Reveal>
            <Reveal delay={0.08} className="w-full md:w-auto">
              <LinkButton href="/signup" size="lg" full className="md:w-auto">
                Create Your Free Profile <ArrowRight className="size-4" />
              </LinkButton>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
