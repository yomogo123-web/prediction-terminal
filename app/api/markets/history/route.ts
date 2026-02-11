import { NextRequest, NextResponse } from "next/server";
import { PricePoint } from "@/lib/types";

const CLOB_API = "https://clob.polymarket.com";

async function fetchPolymarketHistory(token: string): Promise<PricePoint[]> {
  const res = await fetch(
    `${CLOB_API}/prices-history?market=${encodeURIComponent(token)}&interval=max&fidelity=60`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`CLOB API returned ${res.status}`);
  const data = await res.json();
  return (data.history || []).map((point: { t: number; p: number }) => ({
    time: point.t,
    probability: Math.round(point.p * 10000) / 100,
  }));
}

async function fetchKalshiHistory(token: string): Promise<PricePoint[]> {
  // token format: "series_ticker:market_ticker"
  const [seriesTicker, marketTicker] = token.split(":");
  if (!seriesTicker || !marketTicker) return [];

  const endTs = Math.floor(Date.now() / 1000);
  const startTs = endTs - 90 * 86400; // 90 days back

  const res = await fetch(
    `https://api.elections.kalshi.com/trade-api/v2/series/${encodeURIComponent(seriesTicker)}/markets/${encodeURIComponent(marketTicker)}/candlesticks?start_ts=${startTs}&end_ts=${endTs}&period_interval=1440`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`Kalshi API returned ${res.status}`);
  const data = await res.json();
  return (data.candlesticks || []).map(
    (c: { end_period_ts: number; price: { close: number } }) => ({
      time: c.end_period_ts,
      probability: c.price.close, // already 0-100 (cent values)
    })
  );
}

async function fetchManifoldHistory(contractId: string): Promise<PricePoint[]> {
  const res = await fetch(
    `https://api.manifold.markets/v0/market/${encodeURIComponent(contractId)}`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`Manifold API returned ${res.status}`);
  const data = await res.json();

  // Manifold returns bets or probability changes in the market object
  // Use the /bets endpoint for historical data
  const betsRes = await fetch(
    `https://api.manifold.markets/v0/bets?contractId=${encodeURIComponent(contractId)}&limit=200&order=asc`,
    { next: { revalidate: 60 } }
  );
  if (!betsRes.ok) throw new Error(`Manifold bets API returned ${betsRes.status}`);
  const bets = await betsRes.json();

  const points: PricePoint[] = [];
  const seen = new Set<number>();

  for (const bet of bets) {
    if (bet.probAfter == null) continue;
    // Bucket by hour to avoid too many points
    const hourBucket = Math.floor(bet.createdTime / 3600000);
    if (seen.has(hourBucket)) continue;
    seen.add(hourBucket);
    points.push({
      time: Math.floor(bet.createdTime / 1000),
      probability: Math.round(bet.probAfter * 10000) / 100,
    });
  }

  // If we got no bet history, create a single point from current probability
  if (points.length === 0 && data.probability != null) {
    points.push({
      time: Math.floor(Date.now() / 1000),
      probability: Math.round(data.probability * 10000) / 100,
    });
  }

  return points;
}

function generateSyntheticHistory(currentProb: number): PricePoint[] {
  // Generate 30 days of synthetic history anchored to current probability
  const points: PricePoint[] = [];
  const now = Math.floor(Date.now() / 1000);
  const daySeconds = 86400;

  let prob = currentProb + (Math.random() - 0.5) * 10;
  prob = Math.max(1, Math.min(99, prob));

  for (let i = 30; i >= 0; i--) {
    points.push({
      time: now - i * daySeconds,
      probability: Math.round(prob * 100) / 100,
    });
    // Random walk toward current price
    const drift = (currentProb - prob) * 0.05;
    prob += drift + (Math.random() - 0.5) * 3;
    prob = Math.max(1, Math.min(99, prob));
  }
  // Ensure last point matches current
  points[points.length - 1].probability = currentProb;
  return points;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const source = request.nextUrl.searchParams.get("source") || "polymarket";

  if (!token) {
    return NextResponse.json({ error: "Missing token parameter" }, { status: 400 });
  }

  try {
    let history: PricePoint[];

    switch (source) {
      case "polymarket":
        history = await fetchPolymarketHistory(token);
        break;
      case "kalshi":
        history = await fetchKalshiHistory(token);
        break;
      case "manifold":
        history = await fetchManifoldHistory(token);
        break;
      case "predictit": {
        // PredictIt has no public history API — generate synthetic data
        const prob = parseFloat(request.nextUrl.searchParams.get("prob") || "50");
        history = generateSyntheticHistory(prob);
        break;
      }
      default:
        history = [];
    }

    return NextResponse.json(history);
  } catch (error) {
    console.error(`Failed to fetch ${source} price history:`, error);
    return NextResponse.json([], { status: 502 });
  }
}
