import { NextResponse } from "next/server";
import { Market, Category } from "@/lib/types";

// ─── Category Mapping ───────────────────────────────────────────────

function categorize(text: string): Category {
  const t = text.toLowerCase();
  if (/politic|election|president|governor|senate|congress|government|trump|biden|democrat|republican|party|nominee|vote|ballot|legislation|white house|supreme court/.test(t))
    return "Politics";
  if (/sport|nba|nfl|soccer|football|tennis|baseball|mma|ufc|boxing|f1|racing|championship|league|super bowl|world cup|olympic|playoff|mvp|premier league|arsenal|lakers/.test(t))
    return "Sports";
  if (/crypto|bitcoin|btc|ethereum|eth|solana|defi|token|blockchain|stablecoin|coinbase|binance|nft/.test(t))
    return "Crypto";
  if (/tech|ai |artificial|apple|google|microsoft|nvidia|openai|software|chip|tesla|tiktok|spacex|meta |robot|quantum|starship/.test(t))
    return "Tech";
  return "World Events";
}

// ─── Polymarket ─────────────────────────────────────────────────────

async function fetchPolymarket(): Promise<Market[]> {
  const res = await fetch(
    "https://gamma-api.polymarket.com/events?closed=false&limit=40&order=volume24hr&ascending=false",
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Polymarket ${res.status}`);
  const events = await res.json();
  const markets: Market[] = [];

  for (const event of events) {
    if (!event.markets?.length) continue;
    const category = categorize(
      (event.tags || []).map((t: { label?: string; slug?: string }) => t.label || t.slug || "").join(" ") + " " + event.title
    );

    // Filter out inactive placeholder markets (e.g. "Person P", "Person AN")
    let eventMarkets = event.markets.filter(
      (m: Record<string, unknown>) => m.active === true
    );
    if (eventMarkets.length === 0) continue;

    if (eventMarkets.length > 3) {
      eventMarkets = [...eventMarkets]
        .map((m: Record<string, unknown>) => {
          let prob = 50;
          try { const p = JSON.parse(m.outcomePrices as string || "[]"); if (p.length) prob = parseFloat(p[0]) * 100; } catch {}
          return { ...m, _prob: prob };
        })
        .sort((a: { _prob: number }, b: { _prob: number }) => b._prob - a._prob)
        .slice(0, 3);
    }

    for (const mkt of eventMarkets) {
      let probability = 50;
      try { const p = JSON.parse(mkt.outcomePrices || "[]"); if (p.length) probability = Math.round(parseFloat(p[0]) * 10000) / 100; } catch {}

      let clobTokenId: string | undefined;
      try { const ids = JSON.parse(mkt.clobTokenIds || "[]"); if (ids.length) clobTokenId = ids[0]; } catch {}

      const change24h = typeof mkt.oneDayPriceChange === "number"
        ? Math.round(mkt.oneDayPriceChange * 10000) / 100 : 0;

      const title = event.markets.length === 1 ? event.title : mkt.question;
      const mktVolume = parseFloat(mkt.volume) || 0;

      markets.push({
        id: `poly-${mkt.id}`,
        title,
        description: event.description || mkt.question,
        category,
        probability: Math.max(1, Math.min(99, probability)),
        previousProbability: probability,
        volume: mktVolume > 0 ? mktVolume : (event.volume || 0),
        change24h,
        priceHistory: [],
        status: mkt.active ? "active" : "closed",
        endDate: mkt.endDate || event.endDate || "",
        source: "polymarket",
        clobTokenId,
        sourceUrl: `https://polymarket.com/event/${event.slug}`,
      });
    }
  }
  return markets;
}

// ─── Kalshi ─────────────────────────────────────────────────────────

async function fetchKalshi(): Promise<Market[]> {
  // Use events API with nested markets — the markets endpoint returns empty parlays
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(
    "https://api.elections.kalshi.com/trade-api/v2/events?limit=50&status=open&with_nested_markets=true",
    { cache: "no-store", signal: controller.signal }
  );
  clearTimeout(timeout);
  if (!res.ok) throw new Error(`Kalshi ${res.status}`);
  const data = await res.json();
  const markets: Market[] = [];

  for (const event of data.events || []) {
    const eventMarkets = (event.markets || []).filter(
      (m: Record<string, unknown>) => (m.volume as number) > 0 || (m.last_price as number) > 0
    );

    for (const mkt of eventMarkets) {
      const probability = typeof mkt.last_price === "number" && mkt.last_price > 0
        ? mkt.last_price
        : (typeof mkt.yes_ask === "number" && mkt.yes_ask > 0 ? mkt.yes_ask : 50);

      // Kalshi prices are in cents (1-99)
      const prob = Math.max(1, Math.min(99, probability));

      const prevClose = mkt.previous_price || mkt.previous_yes_bid || 0;
      const change24h = prevClose > 0 ? Math.round((prob - prevClose) * 100) / 100 : 0;

      const title = eventMarkets.length === 1
        ? event.title || mkt.title
        : mkt.title || mkt.ticker;

      markets.push({
        id: `kal-${mkt.ticker}`,
        title,
        description: event.title || mkt.subtitle || "",
        category: categorize((event.title || "") + " " + (mkt.title || "") + " " + (mkt.event_ticker || "")),
        probability: prob,
        previousProbability: prob,
        volume: mkt.volume || 0,
        change24h,
        priceHistory: [],
        status: "active",
        endDate: mkt.close_time || "",
        source: "kalshi",
        sourceUrl: `https://kalshi.com/markets/${mkt.ticker}`,
      });
    }
  }
  return markets;
}

// ─── Manifold Markets ───────────────────────────────────────────────

async function fetchManifold(): Promise<Market[]> {
  const res = await fetch(
    "https://api.manifold.markets/v0/search-markets?term=&sort=liquidity&filter=open&limit=50&contractType=BINARY",
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Manifold ${res.status}`);
  const data = await res.json();
  const markets: Market[] = [];

  for (const mkt of data) {
    if (!mkt.probability) continue;

    const prob = Math.round(mkt.probability * 10000) / 100; // 0-1 → 0-100

    // Estimate 24h change from volume activity
    const change24h = mkt.probChanges?.day
      ? Math.round(mkt.probChanges.day * 10000) / 100
      : 0;

    markets.push({
      id: `man-${mkt.id}`,
      title: mkt.question,
      description: mkt.textDescription || mkt.question,
      category: categorize(mkt.question + " " + (mkt.groupSlugs || []).join(" ")),
      probability: Math.max(1, Math.min(99, prob)),
      previousProbability: prob,
      volume: mkt.volume || 0,
      change24h,
      priceHistory: [],
      status: "active",
      endDate: mkt.closeTime ? new Date(mkt.closeTime).toISOString() : "",
      source: "manifold",
      sourceUrl: mkt.url || `https://manifold.markets/${mkt.creatorUsername}/${mkt.slug}`,
    });
  }
  return markets;
}

// ─── PredictIt ──────────────────────────────────────────────────────

async function fetchPredictIt(): Promise<Market[]> {
  const res = await fetch(
    "https://www.predictit.org/api/marketdata/all/",
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`PredictIt ${res.status}`);
  const data = await res.json();
  const markets: Market[] = [];

  for (const mkt of data.markets || []) {
    if (mkt.status !== "Open") continue;

    for (const contract of mkt.contracts || []) {
      if (contract.status !== "Open") continue;

      const prob = contract.lastTradePrice
        ? Math.round(contract.lastTradePrice * 10000) / 100
        : 50;

      const prevClose = contract.lastClosePrice || 0;
      const change24h = prevClose > 0
        ? Math.round((prob - prevClose * 100) * 100) / 100
        : 0;

      // For single-contract markets use market name, otherwise contract name
      const title = mkt.contracts.length === 1
        ? mkt.name
        : `${mkt.shortName} — ${contract.name}`;

      markets.push({
        id: `pit-${contract.id}`,
        title,
        description: mkt.name,
        category: categorize(mkt.name + " " + contract.name),
        probability: Math.max(1, Math.min(99, prob)),
        previousProbability: prob,
        volume: 0, // PredictIt doesn't expose volume
        change24h,
        priceHistory: [],
        status: "active",
        endDate: contract.dateEnd !== "NA" ? contract.dateEnd : "",
        source: "predictit",
        sourceUrl: mkt.url || "https://www.predictit.org",
      });
    }
  }
  return markets;
}

// ─── Aggregator ─────────────────────────────────────────────────────

export async function GET() {
  const results = await Promise.allSettled([
    fetchPolymarket(),
    fetchKalshi(),
    fetchManifold(),
    fetchPredictIt(),
  ]);

  const allMarkets: Market[] = [];
  const sources: string[] = [];

  results.forEach((result, i) => {
    const name = ["Polymarket", "Kalshi", "Manifold", "PredictIt"][i];
    if (result.status === "fulfilled") {
      allMarkets.push(...result.value);
      sources.push(`${name}:${result.value.length}`);
    } else {
      console.error(`Failed to fetch ${name}:`, result.reason?.message || result.reason);
      sources.push(`${name}:ERR`);
    }
  });

  console.log(`[Markets API] Fetched ${allMarkets.length} markets from ${sources.join(", ")}`);

  // Filter out default 50/50 with no activity (but keep PredictIt since it has no volume data)
  const meaningful = allMarkets.filter(
    (m) => m.source === "predictit" || m.probability !== 50 || m.change24h !== 0 || m.volume > 0
  );
  const pool = meaningful.length >= 30 ? meaningful : allMarkets;

  // Sort each source by volume internally, then take top N from each to ensure representation
  const bySource: Record<string, Market[]> = {};
  for (const m of pool) {
    (bySource[m.source] ??= []).push(m);
  }
  for (const src of Object.keys(bySource)) {
    bySource[src].sort((a, b) => b.volume - a.volume);
  }

  // Take up to 75 from each source, then fill remaining with leftovers by volume
  const perSource = 75;
  const selected: Market[] = [];
  const used = new Set<string>();
  for (const [, markets] of Object.entries(bySource)) {
    for (const m of markets.slice(0, perSource)) {
      selected.push(m);
      used.add(m.id);
    }
  }
  // Fill to 300 with remaining markets sorted by volume
  const remaining = pool.filter((m) => !used.has(m.id)).sort((a, b) => b.volume - a.volume);
  for (const m of remaining) {
    if (selected.length >= 300) break;
    selected.push(m);
  }

  // Final sort by volume for display
  selected.sort((a, b) => b.volume - a.volume);

  return NextResponse.json(selected);
}
