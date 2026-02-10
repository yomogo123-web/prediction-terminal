import { NextResponse } from "next/server";
import { Market, Category } from "@/lib/types";

const GAMMA_API = "https://gamma-api.polymarket.com";

function mapCategory(tags: Array<{ label?: string; slug?: string }>, title: string): Category {
  const tagText = tags.map((t) => (t.label || t.slug || "").toLowerCase()).join(" ");
  const combined = tagText + " " + title.toLowerCase();

  if (/politic|election|president|governor|senate|congress|government|trump|biden|democrat|republican|party|nominee/.test(combined))
    return "Politics";
  if (/sport|nba|nfl|soccer|football|tennis|baseball|mma|ufc|boxing|f1|racing|championship|league|super bowl|world cup|olympic/.test(combined))
    return "Sports";
  if (/crypto|bitcoin|btc|ethereum|eth|solana|defi|token|blockchain|stablecoin|coinbase|binance/.test(combined))
    return "Crypto";
  if (/tech|ai |artificial|apple|google|microsoft|nvidia|openai|software|chip|tesla|tiktok|spacex|meta /.test(combined))
    return "Tech";

  return "World Events";
}

interface GammaMarket {
  id: string;
  question: string;
  outcomePrices: string;
  clobTokenIds: string;
  active: boolean;
  closed: boolean;
  volume: string;
  volume24hr: number;
  oneDayPriceChange: number;
  endDate: string;
  bestBid: number;
  bestAsk: number;
  lastTradePrice: number;
}

interface GammaEvent {
  id: string;
  title: string;
  description: string;
  volume: number;
  volume24hr: number;
  markets: GammaMarket[];
  tags: Array<{ label?: string; slug?: string }>;
  endDate: string;
}

export async function GET() {
  try {
    const res = await fetch(
      `${GAMMA_API}/events?closed=false&limit=50&order=volume24hr&ascending=false`,
      { cache: "no-store" }
    );

    if (!res.ok) throw new Error(`Gamma API returned ${res.status}`);

    const events: GammaEvent[] = await res.json();
    const markets: Market[] = [];

    for (const event of events) {
      if (!event.markets || event.markets.length === 0) continue;

      const category = mapCategory(event.tags || [], event.title);

      // For multi-market events (e.g. "Who will win?"), take only the top few
      let eventMarkets = event.markets;
      if (eventMarkets.length > 3) {
        // Sort by probability descending (leading outcomes), take top 3
        eventMarkets = [...eventMarkets]
          .map((m) => {
            let prob = 50;
            try {
              const prices = JSON.parse(m.outcomePrices || "[]");
              if (prices.length > 0) prob = parseFloat(prices[0]) * 100;
            } catch { /* */ }
            return { ...m, _prob: prob };
          })
          .sort((a, b) => b._prob - a._prob)
          .slice(0, 3);
      }

      for (const mkt of eventMarkets) {
        // Parse outcome prices — take first outcome (YES) probability
        let probability = 50;
        try {
          const prices = JSON.parse(mkt.outcomePrices || "[]");
          if (prices.length > 0) {
            probability = Math.round(parseFloat(prices[0]) * 10000) / 100;
          }
        } catch { /* */ }

        // Parse CLOB token IDs
        let clobTokenId: string | undefined;
        try {
          const tokenIds = JSON.parse(mkt.clobTokenIds || "[]");
          if (tokenIds.length > 0) clobTokenId = tokenIds[0];
        } catch { /* */ }

        const change24h = typeof mkt.oneDayPriceChange === "number"
          ? Math.round(mkt.oneDayPriceChange * 10000) / 100
          : 0;

        // Build title: for single-market events use event title,
        // for multi-market use the question (which names the specific outcome)
        const title =
          event.markets.length === 1
            ? event.title
            : mkt.question;

        // Use individual market volume if available, otherwise event volume
        const mktVolume = parseFloat(mkt.volume) || 0;
        const volume = mktVolume > 0 ? mktVolume : (event.volume || 0);

        markets.push({
          id: mkt.id,
          title,
          description: event.description || mkt.question,
          category,
          probability: Math.max(1, Math.min(99, probability)),
          previousProbability: probability,
          volume,
          change24h,
          priceHistory: [],
          status: mkt.active ? "active" : mkt.closed ? "closed" : "resolved",
          endDate: mkt.endDate || event.endDate || "",
          source: "polymarket",
          clobTokenId,
        });
      }
    }

    // Filter out markets with no real price movement (default 50/50)
    const meaningful = markets.filter(
      (m) => m.probability !== 50 || m.change24h !== 0
    );
    // Fall back to all if too few pass the filter
    const pool = meaningful.length >= 20 ? meaningful : markets;

    // Sort by volume descending, take top 60
    pool.sort((a, b) => b.volume - a.volume);
    return NextResponse.json(pool.slice(0, 60));
  } catch (error) {
    console.error("Failed to fetch from Polymarket:", error);
    return NextResponse.json([], { status: 502 });
  }
}
