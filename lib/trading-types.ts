// Order book types

export interface OrderBookLevel {
  price: number; // 0-100 (cents)
  size: number;  // number of shares/contracts
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  midpoint: number | null;
  source: string;
  type: "clob" | "amm" | "none";
}

// Trade types

export type TradeSide = "yes" | "no";
export type OrderType = "market" | "limit";
export type OrderStatus = "pending" | "open" | "filled" | "partial" | "cancelled" | "rejected";

export interface TradeRequest {
  marketId: string;
  side: TradeSide;
  type: OrderType;
  amount: number; // USD
  limitPrice?: number; // 0-100 cents, required for limit orders
}

export interface TradeEstimate {
  estimatedCost: number;
  estimatedShares: number;
  estimatedAvgPrice: number;
  potentialPayout: number;
  potentialProfit: number;
  fees: number;
  warnings: string[];
}

export interface TradeResponse {
  success: boolean;
  orderId?: string;
  status: OrderStatus;
  error?: string;
  fillPrice?: number;
  shares?: number;
}

// Records for UI display

export interface OrderRecord {
  id: string;
  marketId: string;
  platform: string;
  platformOrderId: string | null;
  side: TradeSide;
  type: OrderType;
  amount: number;
  shares: number | null;
  price: number | null;
  fillPrice: number | null;
  status: OrderStatus;
  errorMessage: string | null;
  createdAt: string;
}

export interface PositionRecord {
  id: string;
  marketId: string;
  platform: string;
  side: TradeSide;
  shares: number;
  avgCostBasis: number;
  currentPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  createdAt: string;
}

// Credential types

export interface CredentialStatus {
  platform: string;
  configured: boolean;
  method?: "wallet" | "apikey" | "none";
}

export interface PolymarketCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

export interface KalshiCredentials {
  email?: string;
  password?: string;
  apiKey?: string;
  privateKeyPem?: string;
  authMethod?: "password" | "rsa";
}

export interface ManifoldCredentials {
  apiKey: string;
}

export type PlatformCredentials = PolymarketCredentials | KalshiCredentials | ManifoldCredentials;
