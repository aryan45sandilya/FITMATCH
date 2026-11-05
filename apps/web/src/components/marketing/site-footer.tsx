import Link from "next/link";
import { Logo } from "../brand";

const columns = [
  { title: "Product", links: [{ href: "/#how-it-works", label: "How it works" }, { href: "/brands", label: "Supported brands" }, { href: "/size-guide", label: "Size guide" }, { href: "/signup", label: "Create a profile" }] },
  { title: "Company", links: [{ href: "/about", label: "About" }, { href: "/contact", label: "Contact" }, { href: "/help", label: "Help Center" }] },
  { title: "Legal", links: [{ href: "/privacy", label: "Privacy Policy" }, { href: "/terms", label: "Terms" }] },
];

const socials = [
  { href: "https://www.instagram.com", label: "Instagram" },
  { href: "https://www.linkedin.com", label: "LinkedIn" },
  { href: "https://x.com", label: "X" },
];

export function SiteFooter() {
  return (
    <footer className="bg-night text-paper">
      <div className="mx-auto max-w-[1320px] px-4 pt-16 pb-10 sm:px-6 lg:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo inverse />
            <p className="mt-4 text-[13.5px] leading-relaxed text-[#a9a69e]">
              The intelligence layer between your body measurements and the brands you shop from.
            </p>
          </div>
          {columns.map((c) => (
            <div key={c.title}>
              <h3 className="text-[11px] font-semibold tracking-[0.16em] text-[#8a877f] uppercase">{c.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[14px] text-[#d9d6cf] transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-6 text-[12.5px] text-[#8a877f] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} FitMatch. Brand names belong to their owners; FitMatch is independent and not affiliated with them.</p>
          <ul className="flex gap-5">
            {socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
