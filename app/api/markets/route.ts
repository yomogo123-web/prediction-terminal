import { NextResponse } from "next/server";
import { Market, Category } from "@/lib/types";
import { getDomeClient } from "@/lib/dome";
import type { DomeClient } from "@dome-api/sdk";

// ─── Category Mapping ───────────────────────────────────────────────

const CATEGORY_PATTERNS: { category: Category; pattern: RegExp }[] = [
  { category: "Politics", pattern: /politic|election|president|governor|senate|congress|government|trump|biden|democrat|republican|party|nominee|vote|ballot|legislation|white house|supreme court|fed\b|federal reserve|interest rate|tariff|sanction|executive order|impeach|cabinet|parliamentary/ },
  { category: "Sports", pattern: /sport|nba|nfl|soccer|football|tennis|baseball|mma|ufc|boxing|f1|racing|championship|league|super bowl|world cup|olympic|playoff|mvp|premier league|arsenal|lakers|world series|grand slam|champions league/ },
  { category: "Crypto", pattern: /crypto|bitcoin|btc|ethereum|eth|solana|defi|blockchain|stablecoin|coinbase|binance|nft|memecoin|altcoin|web3|layer 2|polygon|avalanche|cardano/ },
  { category: "Tech", pattern: /\btech|ai\b|artificial intellig|apple|google|microsoft|nvidia|openai|software|chip|tesla|tiktok|spacex|meta\b|robot|quantum|starship|semiconductor|gpus?\b|llm|chatgpt|anthropic|deepmind/ },
];

function categorize(text: string): Category {
  const t = text.toLowerCase();
  let bestCategory: Category = "World Events";
  let bestScore = 0;

  for (const { category, pattern } of CATEGORY_PATTERNS) {
    const matches = t.match(pattern);
    const score = matches ? matches.length : 0;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

// ─── Polymarket (paginated — 3 parallel requests) ───────────────────

async function fetchPolymarket(): Promise<Market[]> {
  const offsets = [0, 40, 80, 120, 160, 200];
  const fetches = offsets.map((offset) =>
    fetch(
      `https://gamma-api.polymarket.com/events?closed=false&limit=40&order=volume24hr&ascending=false&offset=${offset}`,
      { cache: "no-store" }
    ).then((r) => (r.ok ? r.json() : []))
    .catch(() => [])
  );

  const allEvents = (await Promise.all(fetches)).flat();
  const markets: Market[] = [];
  const seen = new Set<string>();

  for (const event of allEvents) {
    if (!event.markets?.length) continue;
    const category = categorize(
      (event.tags || []).map((t: { label?: string; slug?: string }) => t.label || t.slug || "").join(" ") + " " + event.title
    );

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
      const id = `poly-${mkt.id}`;
      if (seen.has(id)) continue;
      seen.add(id);

      let probability = 50;
      try { const p = JSON.parse(mkt.outcomePrices || "[]"); if (p.length) probability = Math.round(parseFloat(p[0]) * 10000) / 100; } catch {}

      let clobTokenId: string | undefined;
      try { const ids = JSON.parse(mkt.clobTokenIds || "[]"); if (ids.length) clobTokenId = ids[0]; } catch {}

      const conditionId = typeof mkt.conditionId === "string" ? mkt.conditionId : undefined;

      const change24h = typeof mkt.oneDayPriceChange === "number"
        ? Math.round(mkt.oneDayPriceChange * 10000) / 100 : 0;

      const title = event.markets.length === 1 ? event.title : mkt.question;
      const mktVolume = parseFloat(mkt.volume) || 0;

      markets.push({
        id,
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
        conditionId,
        sourceUrl: `https://polymarket.com/event/${event.slug}`,
      });
    }
  }
  return markets;
}

// ─── Kalshi (cursor paginated — up to 3 pages) ─────────────────────

async function fetchKalshi(): Promise<Market[]> {
  const markets: Market[] = [];
  let cursor: string | undefined;
  const maxPages = 3;

  for (let page = 0; page < maxPages; page++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const url = `https://api.elections.kalshi.com/trade-api/v2/events?limit=100&status=open&with_nested_markets=true${cursor ? `&cursor=${cursor}` : ""}`;

    try {
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) break;
      const data = await res.json();

      for (const event of data.events || []) {
        const eventMarkets = (event.markets || []).filter(
          (m: Record<string, unknown>) => (m.volume as number) > 0 || (m.last_price as number) > 0
        );

        for (const mkt of eventMarkets) {
          const probability = typeof mkt.last_price === "number" && mkt.last_price > 0
            ? mkt.last_price
            : (typeof mkt.yes_ask === "number" && mkt.yes_ask > 0 ? mkt.yes_ask : 50);

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
            clobTokenId: `${event.series_ticker}:${mkt.ticker}`,
            sourceUrl: `https://kalshi.com/markets/${mkt.ticker}`,
          });
        }
      }

      cursor = data.cursor;
      if (!cursor) break;
    } catch {
      break;
    }
  }
  return markets;
}

// ─── Manifold Markets (bumped to 200) ───────────────────────────────

async function fetchManifold(): Promise<Market[]> {
  const res = await fetch(
    "https://api.manifold.markets/v0/search-markets?term=&sort=liquidity&filter=open&limit=200&contractType=BINARY",
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Manifold ${res.status}`);
  const data = await res.json();
  const markets: Market[] = [];

  for (const mkt of data) {
    if (!mkt.probability) continue;

    const prob = Math.round(mkt.probability * 10000) / 100;
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
      clobTokenId: mkt.id,
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

      const title = mkt.contracts.length === 1
        ? mkt.name
        : `${mkt.shortName} — ${contract.name}`;

      // Use totalSharesTraded if available, otherwise estimate from bestBuy/bestSell activity
      const pitVolume = contract.totalSharesTraded
        ? contract.totalSharesTraded * (contract.lastTradePrice || 0.5)
        : 0;

      markets.push({
        id: `pit-${contract.id}`,
        title,
        description: mkt.name,
        category: categorize(mkt.name + " " + contract.name),
        probability: Math.max(1, Math.min(99, prob)),
        previousProbability: prob,
        volume: pitVolume,
        change24h,
        priceHistory: [],
        status: "active",
        endDate: contract.dateEnd !== "NA" ? contract.dateEnd : "",
        source: "predictit",
        clobTokenId: String(contract.id),
        sourceUrl: mkt.url || "https://www.predictit.org",
      });
    }
  }
  return markets;
}

// ─── Dome: Kalshi via Dome SDK ──────────────────────────────────

async function fetchKalshiViaDome(dome: DomeClient): Promise<Market[]> {
  const markets: Market[] = [];

  // Dome Kalshi API max limit is 100 — paginate up to 3 pages
  const maxPages = 3;
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    const resp = await dome.kalshi.markets.getMarkets({
      status: "open",
      limit: 100,
      offset,
    });

    const batch = resp.markets || [];
    if (batch.length === 0) break;

    for (const mkt of batch) {
      const prob = typeof mkt.last_price === "number" && mkt.last_price > 0
        ? mkt.last_price
        : 50;
      const clampedProb = Math.max(1, Math.min(99, prob));

      markets.push({
        id: `kal-${mkt.market_ticker}`,
        title: mkt.title,
        description: mkt.title,
        category: categorize(mkt.title + " " + (mkt.event_ticker || "")),
        probability: clampedProb,
        previousProbability: clampedProb,
        volume: mkt.volume || 0,
        change24h: 0,
        priceHistory: [],
        status: "active",
        endDate: mkt.end_time ? new Date(mkt.end_time * 1000).toISOString() : "",
        source: "kalshi",
        clobTokenId: `${mkt.event_ticker}:${mkt.market_ticker}`,
        sourceUrl: `https://kalshi.com/markets/${mkt.market_ticker}`,
      });
    }

    if (!resp.pagination?.has_more) break;
    offset += batch.length;
  }

  return markets;
}

// ─── Aggregator ─────────────────────────────────────────────────────

export async function GET() {
  const dome = getDomeClient();

  // Polymarket: always use direct Gamma API (includes inline prices, no rate limits)
  // Kalshi: use Dome when available (better data), fall back to direct API
  const results = await Promise.allSettled([
    fetchPolymarket(),
    dome ? fetchKalshiViaDome(dome) : fetchKalshi(),
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

  // Take up to 250 from each source, then fill remaining with leftovers by volume
  const perSource = 250;
  const selected: Market[] = [];
  const used = new Set<string>();
  for (const [, markets] of Object.entries(bySource)) {
    for (const m of markets.slice(0, perSource)) {
      selected.push(m);
      used.add(m.id);
    }
  }
  // Fill to 1000 with remaining markets sorted by volume
  const remaining = pool.filter((m) => !used.has(m.id)).sort((a, b) => b.volume - a.volume);
  for (const m of remaining) {
    if (selected.length >= 1000) break;
    selected.push(m);
  }

  // Final sort by volume for display
  selected.sort((a, b) => b.volume - a.volume);

  return NextResponse.json(selected);
}
