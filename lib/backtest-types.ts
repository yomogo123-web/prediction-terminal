export interface BacktestStrategy {
  categoryFilter: string | null;
  minProbability: number;
  maxProbability: number;
  holdingPeriodDays: number;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface BacktestTrade {
  marketTitle: string;
  entryProb: number;
  exitProb: number;
  resolution: string;
  returnPct: number;
  date: string;
}

export interface BacktestResult {
  strategy: BacktestStrategy;
  trades: BacktestTrade[];
  totalTrades: number;
  winRate: number;
  avgReturn: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number | null;
  equityCurve: { date: string; equity: number }[];
}
