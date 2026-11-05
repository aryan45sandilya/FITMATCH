"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark, Compass, Gauge, History, LayoutGrid, LogOut, Menu, Ruler, ScanSearch, Settings, Shield, Store, Columns3, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { firstName } from "@/lib/labels";
import { useSession } from "@/lib/session";
import { Logo } from "../brand";
import { MarketPicker } from "./market-picker";
import { cn } from "../ui/primitives";
import { useToast } from "../ui/toast";

const NAV = [
  { href: "/app", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/app/measurements", label: "My Measurements", icon: Ruler },
  { href: "/app/find", label: "Find My Size", icon: ScanSearch },
  { href: "/app/compare", label: "Compare Brands", icon: Columns3 },
  { href: "/app/brands", label: "Explore Brands", icon: Store },
  { href: "/app/discover", label: "Product Discovery", icon: Compass },
  { href: "/app/history", label: "Fit History", icon: History },
  { href: "/app/saved", label: "Saved Products", icon: Bookmark },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const MOBILE = [
  { href: "/app", label: "Home", icon: LayoutGrid, exact: true },
  { href: "/app/compare", label: "Compare", icon: Columns3 },
  { href: "/app/find", label: "Find size", icon: ScanSearch, primary: true },
  { href: "/app/discover", label: "Discover", icon: Compass },
];

function isActive(path: string, href: string, exact?: boolean) {
  return exact ? path === href : path === href || path.startsWith(`${href}/`) || (href === "/app/discover" && path.startsWith("/app/products"));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, loading, logout } = useSession();
  const [more, setMore] = useState(false);

  useEffect(() => setMore(false), [path]);

  // Middleware only checks the cookie; bounce if the session turns out to be invalid.
  useEffect(() => {
    if (!loading && !user) window.location.assign(`/login?next=${encodeURIComponent(path)}`);
  }, [loading, user, path]);

  const initials = user?.fullName.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() ?? "";

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center px-6">
          <Logo href="/app" />
        </div>
        <nav aria-label="App" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {NAV.map((n) => {
              const on = isActive(path, n.href, n.exact);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={on ? "page" : undefined}
                    className={cn("relative flex h-10 items-center gap-3 rounded-sm px-3 text-[13.5px] font-medium transition-colors", on ? "bg-canvas text-ink" : "text-muted hover:bg-canvas/60 hover:text-ink")}
                  >
                    {on && <motion.span layoutId="nav-ind" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />}
                    <n.icon className="size-4" strokeWidth={1.8} aria-hidden />
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          {user?.role === "admin" && (
            <Link href="/admin" className="mt-6 flex h-10 items-center gap-3 rounded-sm border border-line px-3 text-[13.5px] font-medium text-muted hover:text-ink">
              <Shield className="size-4" strokeWidth={1.8} /> Admin panel
            </Link>
          )}
        </nav>
        <div className="border-t border-line p-3">
          <MarketPicker variant="select" className="mb-2" />
          <div className="flex items-center gap-3 rounded-sm px-2 py-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-night text-[12px] font-semibold text-canvas">{initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{user?.fullName ?? " "}</span>
              <span className="block truncate text-[12px] text-muted">{user?.email}</span>
            </span>
            <button type="button" onClick={logout} className="grid size-9 place-items-center rounded-sm text-muted hover:bg-canvas hover:text-ink" aria-label="Sign out">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/95 px-4 backdrop-blur lg:hidden">
          <Logo href="/app" />
          <Link href="/app/settings" className="grid size-9 place-items-center rounded-full bg-night text-[11.5px] font-semibold text-canvas" aria-label="Account settings">
            {initials}
          </Link>
        </header>

        {user && !user.emailVerified && <VerifyBanner />}

        <main className="mx-auto w-full max-w-[1180px] px-4 pt-6 pb-[calc(96px+env(safe-area-inset-bottom))] sm:px-6 md:pt-10 lg:px-10 lg:pb-16">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-safe backdrop-blur lg:hidden">
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
          {MOBILE.map((n) => {
            const on = isActive(path, n.href, n.exact);
            return (
              <li key={n.href}>
                <Link href={n.href} aria-current={on ? "page" : undefined} className="flex h-full flex-col items-center justify-center gap-1">
                  {n.primary ? (
                    <span className={cn("grid size-10 place-items-center rounded-full transition-colors", on ? "bg-accent text-white" : "bg-ink text-canvas")}>
                      <n.icon className="size-[18px]" strokeWidth={2} />
                    </span>
                  ) : (
                    <n.icon className={cn("size-5", on ? "text-ink" : "text-faint")} strokeWidth={on ? 2.1 : 1.8} />
                  )}
                  {!n.primary && <span className={cn("text-[10.5px] font-semibold", on ? "text-ink" : "text-faint")}>{n.label}</span>}
                  {n.primary && <span className="sr-only">{n.label}</span>}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setMore(true)} className="flex h-full w-full flex-col items-center justify-center gap-1" aria-haspopup="dialog" aria-expanded={more}>
              <Menu className="size-5 text-faint" strokeWidth={1.8} />
              <span className="text-[10.5px] font-semibold text-faint">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <AnimatePresence>
        {more && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-night/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMore(false)} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="More navigation"
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-lg bg-surface px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[15px] font-semibold">Hi, {user ? firstName(user.fullName) : ""}</p>
                <button type="button" onClick={() => setMore(false)} className="grid size-9 place-items-center rounded-sm text-muted" aria-label="Close">
                  <X className="size-5" />
                </button>
              </div>
              <MarketPicker variant="compact" className="mb-3 w-full [&>button]:flex-1" />
              <ul className="grid grid-cols-3 gap-2">
                {[...NAV.filter((n) => !MOBILE.some((m) => m.href === n.href)), ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: Gauge }] : [])].map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="flex h-20 flex-col items-center justify-center gap-2 rounded-sm border border-line text-center text-[12px] font-medium">
                      <n.icon className="size-5 text-ink" strokeWidth={1.7} />
                      {n.label.replace("My ", "").replace(" Products", "")}
                    </Link>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={logout} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-sm text-[14px] font-semibold text-muted">
                <LogOut className="size-4" /> Sign out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function VerifyBanner() {
  const toast = useToast();
  const [dev, setDev] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      setDev(sessionStorage.getItem("fm_dev_verify"));
    } catch {
      /* ignore */
    }
  }, []);
  async function resend() {
    setBusy(true);
    try {
      const r = await api.post<{ devVerificationUrl?: string }>("/auth/resend-verification");
      if (r.devVerificationUrl) setDev(r.devVerificationUrl);
      toast("Verification email sent");
    } catch {
      toast("Couldn't send the email. Try again shortly.", "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="border-b border-warning/20 bg-warning-soft/70">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-[13px] sm:px-6 lg:px-10">
        <span className="text-[#7b5420]">Please verify your email address.</span>
        <button type="button" onClick={resend} disabled={busy} className="font-semibold text-ink underline-offset-2 hover:underline disabled:opacity-50">
          Resend link
        </button>
        {dev && (
          <a href={dev} className="font-semibold text-accent underline-offset-2 hover:underline">
            Open link (dev mode — email delivery not configured)
          </a>
        )}
      </div>
    </div>
  );
}
