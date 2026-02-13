import { OrderBook, TradeRequest, TradeResponse, TradeEstimate } from "../trading-types";

export interface MarketRef {
  marketId: string;
  clobTokenId?: string;
  conditionId?: string;
  source: string;
}

export interface TradingAdapter {
  getOrderBook(market: MarketRef): Promise<OrderBook>;
  placeOrder(order: TradeRequest, credentials: Record<string, string>): Promise<TradeResponse>;
  cancelOrder(platformOrderId: string, credentials: Record<string, string>): Promise<boolean>;
  estimateTrade(order: TradeRequest, orderBook?: OrderBook): TradeEstimate;
}
