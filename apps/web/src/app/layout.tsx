import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Playfair_Display } from "next/font/google";
import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/components/ui/toast";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", style: ["normal", "italic"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "FitMatch — One profile. Every brand. The right fit.", template: "%s · FitMatch" },
  description:
    "FitMatch turns one body measurement profile into explainable size recommendations across the brands you shop — product by product.",
  applicationName: "FitMatch",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6F2" },
    { media: "(prefers-color-scheme: dark)", color: "#16161a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
