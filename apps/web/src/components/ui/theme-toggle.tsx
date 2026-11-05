"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { THEME_STORAGE_KEY as KEY } from "@/lib/theme";

export type ThemeChoice = "light" | "dark" | "system";

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    /* storage unavailable: the choice still applies for this page view */
  }
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme");
    setChoice(t === "light" || t === "dark" ? t : "system");
  }, []);
  return {
    choice,
    setTheme: (c: ThemeChoice) => {
      apply(c);
      setChoice(c);
    },
  };
}

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Three-way switch. `labels` shows text next to icons (settings page); otherwise icon-only. */
export function ThemeToggle({ className, labels = false }: { className?: string; labels?: boolean }) {
  const { choice, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Colour theme" className={cn("inline-flex rounded-sm border border-line-strong bg-surface p-0.5", className)}>
      {OPTIONS.map((o) => {
        const on = choice === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${o.label} theme`}
            title={`${o.label} theme`}
            onClick={() => setTheme(o.value)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xs font-semibold transition-colors",
              labels ? "h-9 px-3 text-[13px]" : "size-8",
              on ? "bg-ink text-canvas" : "text-muted hover:text-ink",
            )}
          >
            <o.icon className="size-3.5" aria-hidden />
            {labels && o.label}
          </button>
        );
      })}
    </div>
  );
}
