import { TradingAdapter } from "./adapter";
import { PolymarketAdapter } from "./polymarket";
import { KalshiAdapter } from "./kalshi";
import { ManifoldAdapter } from "./manifold";
import { PredictItAdapter } from "./predictit";

const adapters: Record<string, TradingAdapter> = {
  polymarket: new PolymarketAdapter(),
  kalshi: new KalshiAdapter(),
  manifold: new ManifoldAdapter(),
  predictit: new PredictItAdapter(),
};

export function getAdapter(source: string): TradingAdapter {
  return adapters[source] || adapters.predictit;
}

export type { TradingAdapter, MarketRef } from "./adapter";
