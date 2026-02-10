export type Category = "Politics" | "Sports" | "Crypto" | "Tech" | "World Events";

export interface PricePoint {
  time: number; // unix timestamp in seconds
  probability: number; // 0-100
}

export interface Market {
  id: string;
  title: string;
  description: string;
  category: Category;
  probability: number; // current probability 0-100
  previousProbability: number; // for calculating live change flash
  volume: number; // total volume in USD
  change24h: number; // percentage point change in last 24h
  priceHistory: PricePoint[];
  status: "active" | "resolved" | "closed";
  resolution?: "yes" | "no";
  endDate: string; // ISO date string
  source: "polymarket" | "kalshi" | "manifold" | "predictit" | "mock";
  clobTokenId?: string; // Polymarket CLOB token ID for price history
  sourceUrl?: string; // Link to market on source platform
}

export type SortField = "probability" | "volume" | "change24h" | "title";
export type SortDirection = "asc" | "desc";
