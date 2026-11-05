import Link from "next/link";
import { cn } from "@/lib/cn";

/** FitMatch mark: a tape-measure tick inside a square — precise, not cute. */
export function LogoMark({ className, inverse }: { className?: string; inverse?: boolean }) {
  // Follows the theme (ink square on canvas); `inverse` is for the always-dark night panels.
  const fg = inverse ? "var(--fm-paper)" : "var(--fm-ink)";
  const tick = inverse ? "var(--fm-paper-ink)" : "var(--fm-canvas)";
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="2" style={{ fill: fg }} />
      <path d="M6 7H18" style={{ stroke: tick }} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 7V17M10 7V11M14 7V13M18 7V11" style={{ stroke: tick }} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="17.5" cy="16.5" r="1.6" style={{ fill: "var(--fm-accent)" }} />
    </svg>
  );
}

export function Logo({ href = "/", inverse, className }: { href?: string; inverse?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="FitMatch home">
      <LogoMark inverse={inverse} />
      <span className={cn("text-[17px] font-bold tracking-[-0.03em]", inverse ? "text-paper" : "text-ink")}>
        FitMatch
      </span>
    </Link>
  );
}

export function DemoDataBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex h-5 items-center rounded-xs border border-warning/30 bg-warning-soft px-1.5 text-[10px] font-bold tracking-[0.08em] text-warning-text uppercase", className)}
      title="Demonstration data: approximated, not verified against the brand's published chart."
    >
      Demo data
    </span>
  );
}
