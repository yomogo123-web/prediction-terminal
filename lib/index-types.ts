export interface MarketIndexItem {
  id: string;
  marketId: string;
  weight: number;
}

export interface MarketIndex {
  id: string;
  name: string;
  items: MarketIndexItem[];
  createdAt: string;
}

export interface ComputedIndex {
  id: string;
  name: string;
  items: MarketIndexItem[];
  probability: number; // weighted avg probability
  change24h: number;   // weighted avg change
  marketCount: number;
  createdAt: string;
}
