import type { Metadata } from "next";
import { PageIntro } from "@/components/marketing/page-intro";

export const metadata: Metadata = { title: "Help Center" };

const faqs: [string, string][] = [
  ["Which measurements do I really need?", "Only the ones for the categories you shop. Tops need chest; shirts also need neck; jeans and trousers need waist and hips. The Size Guide lists what each category uses."],
  ["Why did I get an alternative size?", "When two sizes score closely, we show the runner-up and explain the trade-off — usually more room versus a closer fit."],
  ["What does “Insufficient product sizing information” mean?", "We don't hold enough reliable measurements for that item to recommend a size responsibly, so we don't guess."],
  ["What is demo data?", "The current catalogue uses approximated sizing data for demonstration. It is clearly labelled and never marked as verified."],
  ["How does feedback change my results?", "Your own feedback nudges your next recommendation for the same brand and category. Product-wide changes need several different shoppers to agree, and are capped."],
  ["Can I switch between centimetres and inches?", "Yes — anywhere you see measurements. We store everything in centimetres and convert for display."],
];

export default function HelpPage() {
  return (
    <>
      <PageIntro eyebrow="Help Center" title="Questions, answered." />
      <dl className="max-w-3xl divide-y divide-line border-y border-line">
        {faqs.map(([q, a]) => (
          <div key={q} className="grid gap-2 py-6 md:grid-cols-[1fr_1.4fr] md:gap-10">
            <dt className="text-[16px] font-semibold tracking-[-0.01em]">{q}</dt>
            <dd className="text-[15px] leading-relaxed text-muted">{a}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
