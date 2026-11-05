import type { Metadata } from "next";

export const metadata: Metadata = { title: "Product Discovery" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
