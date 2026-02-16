import { Market, PricePoint } from "./types";

export async function fetchMarkets(): Promise<Market[]> {
  const res = await fetch("/api/markets");
  if (!res.ok) throw new Error(`Failed to fetch markets: ${res.status}`);
  return res.json();
}

export async function fetchPriceHistory(
  token: string,
  source: string,
  probability?: number,
  conditionId?: string
): Promise<PricePoint[]> {
  const params = new URLSearchParams({ token, source });
  if (source === "predictit" && probability != null) {
    params.set("prob", String(probability));
  }
  if (conditionId) {
    params.set("conditionId", conditionId);
  }
  const res = await fetch(`/api/markets/history?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
  return res.json();
}
