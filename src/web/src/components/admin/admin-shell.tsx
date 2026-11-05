"use client";

import { ArrowLeft, BarChart3, Boxes, ClipboardCheck, MessageSquare, Shapes, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/session";
import { LogoMark } from "../brand";
import { Skeleton, cn } from "../ui/primitives";
import { ThemeToggle } from "../ui/theme-toggle";

const NAV = [
  { href: "/admin", label: "Overview", icon: BarChart3, exact: true },
  { href: "/admin/brands", label: "Brands", icon: Store },
  { href: "/admin/products", label: "Products", icon: Boxes },
  { href: "/admin/charts", label: "Size charts", icon: ClipboardCheck },
  { href: "/admin/categories", label: "Categories", icon: Shapes },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) window.location.assign(user ? "/app" : "/login?next=/admin");
  }, [loading, user]);

  if (loading || user?.role !== "admin") {
    return <div className="mx-auto max-w-5xl p-10"><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-night text-paper">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-6 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <LogoMark inverse className="size-5" />
            <span className="text-[14px] font-bold tracking-[-0.02em]">FitMatch <span className="font-medium text-[#8a877f]">Admin</span></span>
          </Link>
          <nav aria-label="Admin" className="scrollbar-none flex flex-1 gap-1 overflow-x-auto">
            {NAV.map((n) => {
              const on = n.exact ? path === n.href : path.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} className={cn("flex h-9 shrink-0 items-center gap-2 rounded-sm px-3 text-[13px] font-medium transition-colors", on ? "bg-white/10 text-white" : "text-[#a9a69e] hover:text-white")}>
                  <n.icon className="size-4" strokeWidth={1.8} /> <span className="hidden sm:inline">{n.label}</span>
                </Link>
              );
            })}
          </nav>
          <ThemeToggle className="hidden border-white/15 bg-transparent sm:inline-flex [&_[aria-checked=false]]:text-[#a9a69e] [&_[aria-checked=true]]:bg-paper [&_[aria-checked=true]]:text-paper-ink" />
          <Link href="/app" className="hidden items-center gap-1.5 text-[12.5px] text-[#a9a69e] hover:text-white md:flex"><ArrowLeft className="size-3.5" /> App</Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 md:py-10">{children}</main>
    </div>
  );
}
