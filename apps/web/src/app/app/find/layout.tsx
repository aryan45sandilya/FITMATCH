import type { Metadata } from "next";

export const metadata: Metadata = { title: "Find My Size" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
