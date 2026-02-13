import { TradingAdapter } from "./adapter";
import { OrderBook, TradeRequest, TradeResponse, TradeEstimate } from "../trading-types";

export class PredictItAdapter implements TradingAdapter {
  async getOrderBook(): Promise<OrderBook> {
    return {
      bids: [],
      asks: [],
      bestBid: null,
      bestAsk: null,
      spread: null,
      midpoint: null,
      source: "predictit",
      type: "none",
    };
  }

  async placeOrder(): Promise<TradeResponse> {
    return {
      success: false,
      status: "rejected",
      error: "Trading not available on PredictIt",
    };
  }

  async cancelOrder(): Promise<boolean> {
    return false;
  }

  estimateTrade(): TradeEstimate {
    return {
      estimatedCost: 0,
      estimatedShares: 0,
      estimatedAvgPrice: 0,
      potentialPayout: 0,
      potentialProfit: 0,
      fees: 0,
      warnings: ["Trading not available on PredictIt"],
    };
  }
}
