export interface PortfolioStats {
  totalInvested: number;
  currentValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;
  winRate: number | null;
  totalTrades: number;
  openPositions: number;
  byPlatform: PortfolioByPlatformEntry[];
  byCategory: PortfolioByCategoryEntry[];
  positions: PortfolioPosition[];
}

export interface PortfolioByPlatformEntry {
  platform: string;
  invested: number;
  currentValue: number;
  positionCount: number;
}

export interface PortfolioByCategoryEntry {
  category: string;
  invested: number;
  currentValue: number;
  positionCount: number;
}

export interface PortfolioPosition {
  id: string;
  marketId: string;
  marketTitle: string;
  platform: string;
  side: string;
  shares: number;
  avgCostBasis: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
}
