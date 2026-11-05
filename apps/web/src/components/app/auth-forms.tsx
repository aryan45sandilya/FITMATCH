"use client";

import { CheckCircle2, Eye, EyeOff, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { Button, Field, Input, LinkButton, Notice, Select, cn } from "../ui/primitives";

function AuthHeading({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[28px] font-semibold tracking-[-0.025em]">{title}</h1>
      {sub && <p className="mt-2 text-[14.5px] text-muted">{sub}</p>}
    </div>
  );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function GoogleButton() {
  const { data } = useApi<{ google: boolean }>("/auth/providers");
  if (!data?.google) return null;
  return (
    <>
      <a
        href="/api/auth/google"
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-sm border border-line-strong bg-surface text-sm font-semibold transition-colors hover:border-ink"
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
        </svg>
        Continue with Google
      </a>
      <div className="my-6 flex items-center gap-3 text-[12px] text-faint">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}

function useFormError() {
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<Record<string, string>>({});
  const handle = (err: unknown) => {
    if (err instanceof ApiError) {
      setError(err.message);
      setFields(err.details ?? {});
    } else setError("Something went wrong.");
  };
  return { error, fields, handle, reset: () => (setError(undefined), setFields({})) };
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const f = useFormError();
  const oauthError = params.get("error");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    f.reset();
    setBusy(true);
    try {
      const { user } = await api.post<{ user: User }>("/auth/login", { email, password });
      setUser(user);
      const next = params.get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : user.role === "admin" ? "/admin" : "/app");
    } catch (err) {
      f.handle(err);
      setBusy(false);
    }
  }

  return (
    <>
      <AuthHeading title="Welcome back" sub={<>New to FitMatch? <Link href="/signup" className="font-semibold text-ink underline-offset-2 hover:underline">Create a profile</Link></>} />
      <GoogleButton />
      {oauthError && <Notice tone="danger" className="mb-5">Google sign-in didn&apos;t complete. Please try again.</Notice>}
      <form onSubmit={submit} className="space-y-5" noValidate>
        {f.error && <Notice tone="danger">{f.error}</Notice>}
        <Field label="Email" htmlFor="email" error={f.fields.email}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} invalid={Boolean(f.fields.email)} />
        </Field>
        <Field label="Password" htmlFor="password" error={f.fields.password}>
          <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-[13px] font-medium text-muted hover:text-ink">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" full loading={busy}>Sign In</Button>
      </form>
    </>
  );
}

const rules = [
  { test: (p: string) => p.length >= 10, label: "10+ characters" },
  { test: (p: string) => /[a-zA-Z]/.test(p) && /[^a-zA-Z]/.test(p), label: "Letters and a number or symbol" },
];

export function SignupForm() {
  const router = useRouter();
  const { setUser } = useSession();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", genderFit: "" });
  const [busy, setBusy] = useState(false);
  const f = useFormError();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    f.reset();
    setBusy(true);
    try {
      const res = await api.post<{ user: User; devVerificationUrl?: string }>("/auth/signup", { ...form, genderFit: form.genderFit || undefined });
      setUser(res.user);
      if (res.devVerificationUrl) sessionStorage.setItem("fm_dev_verify", res.devVerificationUrl);
      router.push("/onboarding");
    } catch (err) {
      f.handle(err);
      setBusy(false);
    }
  }

  return (
    <>
      <AuthHeading title="Create your profile" sub={<>Already have an account? <Link href="/login" className="font-semibold text-ink underline-offset-2 hover:underline">Sign in</Link></>} />
      <GoogleButton />
      <form onSubmit={submit} className="space-y-5" noValidate>
        {f.error && <Notice tone="danger">{f.error}</Notice>}
        <Field label="Full name" htmlFor="name" error={f.fields.fullName}>
          <Input id="name" autoComplete="name" required value={form.fullName} onChange={set("fullName")} invalid={Boolean(f.fields.fullName)} />
        </Field>
        <Field label="Email" htmlFor="email" error={f.fields.email}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" required value={form.email} onChange={set("email")} invalid={Boolean(f.fields.email)} />
        </Field>
        <Field label="Password" htmlFor="password" error={f.fields.password}>
          <PasswordInput id="password" autoComplete="new-password" required value={form.password} onChange={set("password")} invalid={Boolean(f.fields.password)} />
          <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            {rules.map((r) => {
              const ok = r.test(form.password);
              return (
                <li key={r.label} className={cn("flex items-center gap-1.5 text-[12px] transition-colors", ok ? "text-success" : "text-faint")}>
                  <CheckCircle2 className="size-3.5" aria-hidden /> {r.label}
                </li>
              );
            })}
          </ul>
        </Field>
        <Field label="I usually shop" htmlFor="gender" optional hint="Helps us pick the right size chart when a brand has several.">
          <Select id="gender" value={form.genderFit} onChange={set("genderFit")}>
            <option value="">Prefer not to say</option>
            <option value="menswear">Menswear</option>
            <option value="womenswear">Womenswear</option>
            <option value="unisex">Unisex</option>
            <option value="no_preference">No preference</option>
          </Select>
        </Field>
        <Button type="submit" size="lg" full loading={busy}>Create account</Button>
        <p className="text-center text-[12px] leading-relaxed text-faint">
          By continuing you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </form>
    </>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ devResetUrl?: string } | null>(null);
  const f = useFormError();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    f.reset();
    setBusy(true);
    try {
      setSent(await api.post<{ devResetUrl?: string }>("/auth/forgot-password", { email }));
    } catch (err) {
      f.handle(err);
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div>
        <MailCheck className="mb-5 size-8 text-accent" strokeWidth={1.5} />
        <AuthHeading title="Check your inbox" sub={`If an account exists for ${email}, we've sent a link to reset your password. It expires in one hour.`} />
        {sent.devResetUrl && (
          <Notice tone="accent" className="mb-5">
            Development mode: email delivery isn&apos;t configured, so here is the link. <a href={sent.devResetUrl} className="font-semibold underline">Open reset link</a>
          </Notice>
        )}
        <LinkButton href="/login" variant="secondary" full>Back to sign in</LinkButton>
      </div>
    );

  return (
    <>
      <AuthHeading title="Reset your password" sub="Enter your email and we'll send you a reset link." />
      <form onSubmit={submit} className="space-y-5" noValidate>
        {f.error && <Notice tone="danger">{f.error}</Notice>}
        <Field label="Email" htmlFor="email" error={f.fields.email}>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" full loading={busy}>Send reset link</Button>
        <Link href="/login" className="block text-center text-[13px] font-medium text-muted hover:text-ink">Back to sign in</Link>
      </form>
    </>
  );
}

export function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useSession();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const f = useFormError();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    f.reset();
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      await refresh();
      router.push("/app");
    } catch (err) {
      f.handle(err);
      setBusy(false);
    }
  }

  if (!token) return <Notice tone="danger">This reset link is missing its token. Request a new one from the sign-in page.</Notice>;
  return (
    <>
      <AuthHeading title="Choose a new password" sub="You'll be signed out of other devices." />
      <form onSubmit={submit} className="space-y-5" noValidate>
        {f.error && <Notice tone="danger">{f.error} {f.error.includes("expired") && <Link href="/forgot-password" className="font-semibold underline">Request a new link</Link>}</Notice>}
        <Field label="New password" htmlFor="password" error={f.fields.password} hint="At least 10 characters, mixing letters with numbers or symbols.">
          <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" full loading={busy}>Update password</Button>
      </form>
    </>
  );
}

export function VerifyEmail() {
  const params = useSearchParams();
  const { refresh, user } = useSession();
  const token = params.get("token");
  const [state, setState] = useState<"working" | "done" | "error">(token ? "working" : "error");
  const [message, setMessage] = useState("This verification link is missing its token.");

  useEffect(() => {
    if (!token) return;
    api
      .post("/auth/verify-email", { token })
      .then(async () => {
        setState("done");
        await refresh();
      })
      .catch((err: ApiError) => {
        setState("error");
        setMessage(err.message);
      });
  }, [token, refresh]);

  if (state === "working") return <AuthHeading title="Verifying your email…" />;
  if (state === "done")
    return (
      <div>
        <CheckCircle2 className="mb-5 size-8 text-success" strokeWidth={1.5} />
        <AuthHeading title="Email verified" sub="Thanks — your account is confirmed." />
        <LinkButton href={user ? "/app" : "/login"} full size="lg">Continue</LinkButton>
      </div>
    );
  return (
    <div>
      <AuthHeading title="Link didn't work" sub={message} />
      <LinkButton href={user ? "/app/settings" : "/login"} variant="secondary" full>{user ? "Resend from Settings" : "Sign in"}</LinkButton>
    </div>
  );
}
