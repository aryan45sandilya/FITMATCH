import type { Request } from "express";

export const MARKETS = ["IN", "US", "UK_EU"] as const;
export type Market = (typeof MARKETS)[number];
export type ChartMarket = Market | "GLOBAL";

export const MARKET_LABEL: Record<ChartMarket, string> = {
  IN: "India",
  US: "United States",
  UK_EU: "UK & Europe",
  GLOBAL: "Demo",
};

export function isMarket(v: unknown): v is Market {
  return typeof v === "string" && (MARKETS as readonly string[]).includes(v);
}

/** Explicit ?market= (or body.market) wins; otherwise the signed-in user's preference; otherwise India. */
export function marketFor(req: Request, explicit?: unknown): Market {
  if (isMarket(explicit)) return explicit;
  const q = req.query?.market;
  if (isMarket(q)) return q;
  return req.user?.market ?? "IN";
}

/** Explains why a chart from another market (or demo data) is being used. */
export function chartMarketNote(brandName: string, chartMarket: ChartMarket, wanted: Market, notPublished?: string | null): string | null {
  if (chartMarket === wanted || chartMarket === "GLOBAL") return null;
  return `Using ${brandName}'s ${MARKET_LABEL[chartMarket]} chart — ${notPublished ? `no ${MARKET_LABEL[wanted]} chart (${notPublished.replace(/\.$/, "")})` : `no ${MARKET_LABEL[wanted]} chart is on file`}.`;
}
