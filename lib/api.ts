import { Market, PricePoint } from "./types";

export async function fetchMarkets(): Promise<Market[]> {
  const res = await fetch("/api/markets");
  if (!res.ok) throw new Error(`Failed to fetch markets: ${res.status}`);
  return res.json();
}

export async function fetchPriceHistory(clobTokenId: string): Promise<PricePoint[]> {
  const res = await fetch(`/api/markets/history?token=${encodeURIComponent(clobTokenId)}`);
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
  return res.json();
}
