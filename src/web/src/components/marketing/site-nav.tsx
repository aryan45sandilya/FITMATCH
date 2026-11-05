"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { Logo } from "../brand";
import { LinkButton, cn } from "../ui/primitives";
import { ThemeToggle } from "../ui/theme-toggle";

const links = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/brands", label: "Explore Brands" },
  { href: "/size-guide", label: "Size Guide" },
  { href: "/about", label: "About" },
];

export function SiteNav() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={cn("chrome sticky top-0 z-40 bg-canvas/95 backdrop-blur-md transition-[border-color] duration-300", scrolled || open ? "border-b border-line" : "border-b border-transparent")}>
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-[13.5px] font-medium text-muted transition-colors hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle className="mr-1" />
          {user ? (
            <LinkButton href="/app" size="sm">Open FitMatch</LinkButton>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">Sign In</LinkButton>
              <LinkButton href="/signup" size="sm">Get Started</LinkButton>
            </>
          )}
        </div>
        <button
          type="button"
          className="-mr-2 grid size-11 place-items-center rounded-sm lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "calc(100dvh - 64px)" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line bg-canvas lg:hidden"
          >
            <nav aria-label="Mobile" className="flex h-full flex-col px-4 pt-4 pb-8 sm:px-6">
              {links.map((l, i) => (
                <motion.div key={l.href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}>
                  <Link href={l.href} onClick={() => setOpen(false)} className="flex h-14 items-center border-b border-line text-[22px] font-semibold tracking-[-0.02em]">
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <div className="mt-auto flex flex-col gap-2.5 pb-safe">
                <div className="flex items-center justify-between py-2">
                  <span className="text-[14px] font-medium text-muted">Theme</span>
                  <ThemeToggle labels />
                </div>
                {user ? (
                  <LinkButton href="/app" size="lg" full>Open FitMatch</LinkButton>
                ) : (
                  <>
                    <LinkButton href="/signup" size="lg" full>Get Started</LinkButton>
                    <LinkButton href="/login" variant="secondary" size="lg" full>Sign In</LinkButton>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
