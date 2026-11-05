"use client";

import Link from "next/link";
import { forwardRef, useId } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";
export { cn };

// ── Buttons ──────────────────────────────────────────────────────────────────
type Variant = "primary" | "secondary" | "ghost" | "accent" | "inverse" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-canvas hover:bg-ink-hover active:bg-ink-hover",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink",
  ghost: "text-ink hover:bg-ink/[0.04]",
  accent: "bg-accent text-on-accent hover:bg-accent-strong",
  inverse: "bg-paper text-paper-ink hover:bg-white",
  danger: "bg-surface text-danger border border-danger/40 hover:bg-danger-soft",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-[15px] gap-2.5",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", full = false) {
  return cn(
    "inline-flex items-center justify-center rounded-sm font-semibold tracking-[-0.005em] whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,transform] duration-200 ease-out active:scale-[0.985]",
    "disabled:opacity-45 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    full && "w-full",
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, full, loading, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(buttonClass(variant, size, full), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function LinkButton({
  href, variant, size, full, className, children, ...rest
}: { href: string; variant?: Variant; size?: Size; full?: boolean } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const external = href.startsWith("http");
  if (external) {
    return (
      <a href={href} className={cn(buttonClass(variant, size, full), className)} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(buttonClass(variant, size, full), className)} {...rest}>
      {children}
    </Link>
  );
}

// ── Form fields ──────────────────────────────────────────────────────────────
export function Field({
  label, hint, error, children, htmlFor, optional, className,
}: { label: string; hint?: React.ReactNode; error?: string; children: React.ReactNode; htmlFor?: string; optional?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-[13px] font-semibold text-ink">
        <span>{label}</span>
        {optional && <span className="text-[11px] font-medium text-faint">Optional</span>}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-[12.5px] text-danger" role="alert">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden /> {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] leading-relaxed text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full h-11 rounded-sm border bg-surface px-3.5 text-ink placeholder:text-faint transition-colors duration-150 " +
  "border-line-strong hover:border-line-hover focus:border-ink focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-ink/8 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/10";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; suffix?: string }>(
  function Input({ className, invalid, suffix, ...rest }, ref) {
    if (suffix) {
      return (
        <div className="relative">
          <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, "pr-12", className)} {...rest} />
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[13px] font-medium text-muted">{suffix}</span>
        </div>
      );
    }
    return <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(inputBase, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2377756F%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-10", className)}
      {...rest}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(inputBase, "h-auto min-h-24 py-3 leading-relaxed", className)} {...rest} />;
});

// ── Segmented control ────────────────────────────────────────────────────────
export function Segmented<T extends string>({
  value, onChange, options, label, size = "md", className,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; label: string; size?: "sm" | "md"; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-sm border border-line-strong bg-surface p-0.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-xs font-semibold transition-colors duration-150",
              size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-9 px-3.5 text-[13px]",
              active ? "bg-ink text-canvas" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Badges & meters ──────────────────────────────────────────────────────────
type Tone = "neutral" | "success" | "warning" | "danger" | "accent" | "muted" | "dark";
const tones: Record<Tone, string> = {
  neutral: "bg-canvas text-ink border-line",
  success: "bg-success-soft text-success border-success/15",
  warning: "bg-warning-soft text-warning-text border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/15",
  accent: "bg-accent-soft text-accent-text border-accent/20",
  muted: "bg-subtle text-muted border-line",
  dark: "bg-night text-paper border-night",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-xs border px-2 text-[11.5px] font-semibold whitespace-nowrap", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />}
      {children}
    </span>
  );
}

/** Segmented level meter (qualitative — never a percentage). */
export function LevelMeter({ level, max, tone = "ink", label }: { level: number; max: number; tone?: "ink" | "success" | "warning" | "danger" | "accent"; label: string }) {
  const color = { ink: "bg-ink", success: "bg-success", warning: "bg-warning", danger: "bg-danger", accent: "bg-accent" }[tone];
  return (
    <div className="flex gap-1" role="img" aria-label={label}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-500", i < level ? color : "bg-line")} />
      ))}
    </div>
  );
}

// ── States ───────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function EmptyState({
  icon, title, body, action, className,
}: { icon?: React.ReactNode; title: string; body?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-md border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center", className)}>
      {icon && <div className="mb-4 grid size-11 place-items-center rounded-full border border-line bg-canvas text-muted">{icon}</div>}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-danger/20 bg-danger-soft/60 p-5 sm:flex-row sm:items-center sm:justify-between" role="alert">
      <p className="flex items-start gap-2 text-sm text-danger">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Notice({ tone = "muted", icon, children, className }: { tone?: Tone; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-sm border px-3.5 py-3 text-[13px] leading-relaxed", tones[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// ── Layout helpers ───────────────────────────────────────────────────────────
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
        <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink md:text-[32px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ children, className, title, action, padded = true }: { children: React.ReactNode; className?: string; title?: React.ReactNode; action?: React.ReactNode; padded?: boolean }) {
  return (
    <section className={cn("rounded-md border border-line bg-surface", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
          {action}
        </div>
      )}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function useFieldId(prefix: string) {
  const id = useId();
  return `${prefix}-${id.replace(/:/g, "")}`;
}

export function Checkbox({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useFieldId("cb");
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4.5 accent-ink" />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-[13px] text-muted">{description}</span>}
      </span>
    </label>
  );
}
