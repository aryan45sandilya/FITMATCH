"use client";

import { useState } from "react";
import { Badge, Button, Field, Input, Notice, PageHeader, Panel, Segmented, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { MarketPicker } from "@/components/app/market-picker";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { User } from "@/lib/types";

export default function SettingsPage() {
  const { user, setUser, unit, setUnit, logout } = useSession();
  const toast = useToast();
  const [name, setName] = useState(user?.fullName ?? "");
  const [gender, setGender] = useState(user?.genderFit ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwErr, setPwErr] = useState<Record<string, string>>({});
  const [savingPw, setSavingPw] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [devLink, setDevLink] = useState<string>();

  if (!user) return null;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const r = await api.patch<{ user: User }>("/auth/account", { fullName: name, genderFit: gender || null });
      setUser(r.user);
      toast("Account updated");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't save", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPw(true);
    setPwErr({});
    try {
      await api.post("/auth/change-password", { currentPassword: pw.current || undefined, newPassword: pw.next });
      setPw({ current: "", next: "" });
      toast("Password updated. Other devices were signed out.");
    } catch (err) {
      if (err instanceof ApiError) setPwErr({ ...(err.details ?? {}), _: err.details ? "" : err.message });
    } finally {
      setSavingPw(false);
    }
  }

  async function resend() {
    const r = await api.post<{ devVerificationUrl?: string }>("/auth/resend-verification").catch(() => null);
    if (r?.devVerificationUrl) setDevLink(r.devVerificationUrl);
    toast("Verification email sent");
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await api.del("/auth/account", { confirm: "DELETE" });
      window.location.assign("/");
    } catch {
      toast("Couldn't delete your account", "error");
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Settings" title="Account & preferences" />
      <div className="grid max-w-3xl gap-5">
        <Panel title="Account">
          <form onSubmit={saveProfile} className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="s-name"><Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
            <Field label="Email" htmlFor="s-email" hint={
              user.emailVerified ? <Badge tone="success">Verified</Badge> : <span>Not verified · <button type="button" className="font-semibold text-ink underline" onClick={resend}>Resend link</button></span>
            }>
              <Input id="s-email" value={user.email} disabled />
            </Field>
            <Field label="I usually shop" htmlFor="s-gender" hint="Chooses the right chart when a brand has several.">
              <Select id="s-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="menswear">Menswear</option>
                <option value="womenswear">Womenswear</option>
                <option value="unisex">Unisex</option>
                <option value="no_preference">No preference</option>
              </Select>
            </Field>
            <Field label="Size chart market" hint="Recommendations use each brand's chart for this market." className="sm:col-span-2">
              <MarketPicker />
            </Field>
            <Field label="Colour theme" hint="System follows your device's light or dark setting.">
              <ThemeToggle labels />
            </Field>
            <Field label="Measurement units">
              <Segmented label="Measurement units" value={unit} onChange={setUnit} options={[{ value: "cm", label: "Centimetres" }, { value: "in", label: "Inches" }]} />
            </Field>
            <div className="sm:col-span-2"><Button type="submit" loading={savingProfile}>Save changes</Button></div>
          </form>
          {devLink && <Notice tone="accent" className="mt-4">Dev mode: <a className="font-semibold underline" href={devLink}>open verification link</a></Notice>}
        </Panel>

        <Panel title={user.hasPassword ? "Change password" : "Set a password"}>
          <form onSubmit={changePassword} className="grid gap-5 sm:grid-cols-2">
            {user.hasPassword && (
              <Field label="Current password" htmlFor="s-cur" error={pwErr.currentPassword}>
                <Input id="s-cur" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
              </Field>
            )}
            <Field label="New password" htmlFor="s-new" error={pwErr.newPassword} hint="At least 10 characters, with a number or symbol.">
              <Input id="s-new" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
            </Field>
            {pwErr._ && <Notice tone="danger" className="sm:col-span-2">{pwErr._}</Notice>}
            <div className="sm:col-span-2"><Button type="submit" variant="secondary" loading={savingPw} disabled={!pw.next}>Update password</Button></div>
          </form>
        </Panel>

        <Panel title="Sign-in methods">
          <ul className="space-y-2 text-[14px]">
            <li className="flex items-center justify-between"><span>Email & password</span>{user.hasPassword ? <Badge tone="success">On</Badge> : <Badge tone="muted">Not set</Badge>}</li>
            <li className="flex items-center justify-between"><span>Google</span>{user.googleLinked ? <Badge tone="success">Linked</Badge> : <Badge tone="muted">Not linked</Badge>}</li>
          </ul>
          <Button variant="ghost" className="mt-4 -ml-3" onClick={logout}>Sign out of this device</Button>
        </Panel>

        <Panel title="Delete account" className="border-danger/25">
          <p className="text-[14px] leading-relaxed text-muted">Permanently deletes your account, every measurement profile, recommendation, saved product and piece of feedback. This can&apos;t be undone.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field label='Type "DELETE" to confirm' htmlFor="s-del" className="sm:w-60"><Input id="s-del" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" /></Field>
            <Button variant="danger" disabled={confirm !== "DELETE"} loading={deleting} onClick={deleteAccount}>Delete my account</Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
