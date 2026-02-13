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
  conditionId?: string; // Polymarket condition ID for smart money tracking
  sourceUrl?: string; // Link to market on source platform
}

export type SortField = "probability" | "volume" | "change24h" | "title" | "edge";
export type SortDirection = "asc" | "desc";
export type RightPanelTab = "watchlist" | "analytics" | "arbitrage" | "news" | "aitrack" | "trading";

export interface EdgeSignal {
  marketId: string;
  edgeScore: number;         // -100 to +100
  edgeLabel: "STRONG BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG SELL";
  components: {
    crossSourceDivergence: number | null;
    volumeAnomaly: number;
    momentumDivergence: number;
    priceExtremeness: number;
  };
  confidence: number;        // 0-1
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  correlatedMarketIds: string[];
  relevanceScore: number;
}

export interface Alert {
  id: string;
  marketId: string;
  condition: "above" | "below" | "change";
  threshold: number;
  active: boolean;
}

export interface ArbPair {
  marketA: Market;
  marketB: Market;
  spread: number; // absolute price difference
  similarity: number; // 0-1 title similarity
}

export interface CorrelationMatrix {
  labels: string[];
  values: number[][]; // NxN matrix of Pearson coefficients
}

export interface CategoryStat {
  category: Category;
  volume: number;
  count: number;
  avgChange: number;
}

export interface SourceStat {
  source: Market["source"];
  volume: number;
  count: number;
}

export interface ProbabilityBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface HotMarket {
  market: Market;
  score: number;
}

export interface SentimentData {
  bullRatio: number;
  bearRatio: number;
  bullCount: number;
  bearCount: number;
  neutralCount: number;
}

export interface VolatilityData {
  category: Category;
  stdDev: number;
  maxAbsMove: number;
  count: number;
}

export interface VWAPSourceData {
  source: Market["source"];
  vwap: number;
  avg: number;
  count: number;
}

export interface VWAPData {
  overall: { vwap: number; avg: number; skew: number };
  bySource: VWAPSourceData[];
}

export interface ConcentrationData {
  hhi: number;
  top5SharePct: number;
  top5Markets: { title: string; sharePct: number }[];
  label: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH";
}

export interface MispricingSignal {
  market: Market;
  type: "overconfidence" | "opportunity";
  score: number;
}

export interface MomentumData {
  category: Category;
  upPct: number;
  downPct: number;
  netMomentum: number;
  upCount: number;
  downCount: number;
}

export interface AIEdgePrediction {
  marketId: string;
  aiProbability: number;    // AI's estimated probability (0-100)
  marketProbability: number; // current market price
  divergence: number;        // aiProbability - marketProbability
  confidence: "low" | "medium" | "high";
  reasoning: string;         // one-line explanation
}

export interface AITrackStats {
  totalPredictions: number;
  totalResolved: number;
  avgBrierScore: number | null;
  hitRate: number | null;
  calibration: { range: string; avgPredicted: number; avgActual: number; count: number }[];
  recentResolved: {
    id: string; marketTitle: string; aiProbability: number;
    marketProbability: number; resolution: string;
    brierScore: number | null; createdAt: string; resolvedAt: string;
  }[];
  pendingPredictions: {
    id: string; marketId: string; marketTitle: string;
    aiProbability: number; marketProbability: number;
    divergence: number; confidence: string; createdAt: string;
  }[];
}

export interface SmartMoneyTrader {
  rank: number;
  userName: string;
  proxyWallet: string;
  pnl: number;
  volume: number;
  xUsername?: string;
}

export interface SmartMoneyPosition {
  traderWallet: string;
  traderName: string;
  traderRank: number;
  traderPnl: number;
  conditionId: string;
  outcomeIndex: number;   // 0 = YES, 1 = NO
  size: number;
  averagePrice: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
}

export interface SmartMoneySignal {
  marketId: string;
  conditionId: string;
  positions: SmartMoneyPosition[];
  totalYesSize: number;
  totalNoSize: number;
  yesTraderCount: number;
  noTraderCount: number;
  netDirection: "YES" | "NO" | "MIXED";
  strength: "STRONG" | "MODERATE" | "WEAK";
}

export interface MarketAnalytics {
  totalVolume: number;
  marketCount: number;
  avgProbability: number;
  activeSources: number;
  volumeByCategory: CategoryStat[];
  volumeBySource: SourceStat[];
  probabilityDistribution: ProbabilityBucket[];
  hotMarkets: HotMarket[];
  sentiment: SentimentData;
  volatilityByCategory: VolatilityData[];
  vwap: VWAPData;
  concentration: ConcentrationData;
  mispricingSignals: MispricingSignal[];
  categoryMomentum: MomentumData[];
}
