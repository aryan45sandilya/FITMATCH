import type { Metadata } from "next";
import { PageIntro, Prose } from "@/components/marketing/page-intro";
import { LinkButton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About FitMatch"
        title={
          <>
            Not another clothing store. <em className="text-accent">The layer in between.</em>
          </>
        }
      />
      <Prose>
        <p>
          FitMatch sits between a person&apos;s body measurements and the brands they shop from. You record your measurements once; we translate
          them into a size for each brand, category and — where the data exists — each individual product.
        </p>
        <h2>How recommendations work</h2>
        <p>
          Our engine compares your measurements with a brand&apos;s size chart or, better, with a product&apos;s own garment measurements. It accounts
          for wearing ease, fit type, fabric stretch and your fit preference, weighting the measurements that matter most for each category. Chest
          alone never decides a size.
        </p>
        <p>
          Every result explains itself: which measurements sit within range, which are snug or loose, and how confident we are — expressed in plain
          language, never as an invented percentage.
        </p>
        <h2>Honest data</h2>
        <p>
          Each size chart carries its source, collection date and verification status. Only data reviewed against a cited source is labelled as
          verified. The current catalogue is a demonstration dataset and is labelled as such throughout the app.
        </p>
        <h2>Feedback that learns carefully</h2>
        <p>
          When you tell us how something fit, your next recommendation for that brand adjusts — for you. Product-wide adjustments only happen when
          several different people report the same thing, and they are capped. One review can&apos;t rewrite a brand&apos;s sizing.
        </p>
      </Prose>
      <LinkButton href="/signup" size="lg" className="mt-12">
        Create your free profile
      </LinkButton>
    </>
  );
}
