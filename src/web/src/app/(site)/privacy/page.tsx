import type { Metadata } from "next";
import { PageIntro, Prose } from "@/components/marketing/page-intro";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <PageIntro eyebrow="Legal" title="Privacy Policy" lede="Body measurements are personal. Here is exactly how we treat them." />
      <Prose>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: your name, email address and a securely hashed password (or your Google account identifier if you sign in with Google).</li>
          <li>Measurement profiles: body measurements, height, optional weight and age, and fit preferences.</li>
          <li>Activity: size recommendations you request, products you save, and fit feedback you submit.</li>
        </ul>
        <h2>How we use it</h2>
        <p>
          Only to produce your size recommendations and improve their accuracy. Fit feedback may be aggregated anonymously to adjust recommendations
          for a product once enough different people report the same fit.
        </p>
        <h2>What we never do</h2>
        <ul>
          <li>Sell your data or share your measurements with brands or advertisers.</li>
          <li>Show your measurements to other users.</li>
          <li>Place personal data in URLs or analytics events.</li>
        </ul>
        <h2>Security</h2>
        <p>
          Sessions use secure, HTTP-only cookies. Passwords are hashed with scrypt. Measurement data is sent over HTTPS and is never stored by shared
          caches.
        </p>
        <h2>Your controls</h2>
        <p>
          You can edit or delete any measurement profile at any time, and permanently delete your account — including every measurement,
          recommendation and piece of feedback — from Settings.
        </p>
      </Prose>
    </>
  );
}
