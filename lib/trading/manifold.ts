import { TradingAdapter, MarketRef } from "./adapter";
import { OrderBook, TradeRequest, TradeResponse, TradeEstimate } from "../trading-types";

export class ManifoldAdapter implements TradingAdapter {
  async getOrderBook(market: MarketRef): Promise<OrderBook> {
    // Manifold is AMM — no order book, but we show synthetic view from pool data
    const slug = market.marketId.replace(/^man-/, "");
    if (!slug) {
      return { bids: [], asks: [], bestBid: null, bestAsk: null, spread: null, midpoint: null, source: "manifold", type: "amm" };
    }

    try {
      const res = await fetch(`https://api.manifold.markets/v0/slug/${slug}`);
      if (!res.ok) throw new Error(`Manifold API: ${res.status}`);
      const data = await res.json();

      const prob = data.probability || 0.5;
      const yesPrice = prob * 100;
      const noPrice = (1 - prob) * 100;

      // Synthetic book: single level at current AMM price
      const pool = data.pool || {};
      const liquidity = (pool.YES || 0) + (pool.NO || 0);

      return {
        bids: [{ price: yesPrice, size: liquidity / 2 }],
        asks: [{ price: yesPrice, size: liquidity / 2 }],
        bestBid: yesPrice,
        bestAsk: yesPrice,
        spread: 0,
        midpoint: yesPrice,
        source: "manifold",
        type: "amm",
      };
    } catch (e) {
      console.warn("Manifold market data fetch failed:", e);
      return { bids: [], asks: [], bestBid: null, bestAsk: null, spread: null, midpoint: null, source: "manifold", type: "amm" };
    }
  }

  async placeOrder(order: TradeRequest, credentials: Record<string, string>): Promise<TradeResponse> {
    if (!credentials.apiKey) {
      return { success: false, status: "rejected", error: "Missing Manifold API key" };
    }

    try {
      const contractId = order.marketId.replace(/^man-/, "");
      const body = {
        contractId,
        outcome: order.side === "yes" ? "YES" : "NO",
        amount: order.amount,
      };

      if (order.type === "limit" && order.limitPrice) {
        Object.assign(body, { limitProb: order.limitPrice / 100 });
      }

      const res = await fetch("https://api.manifold.markets/v0/bet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${credentials.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, status: "rejected", error: `Manifold API error: ${errText}` };
      }

      const data = await res.json();
      return {
        success: true,
        orderId: data.betId || data.id,
        status: "filled",
        fillPrice: data.probAfter ? data.probAfter * 100 : undefined,
        shares: data.shares,
      };
    } catch (e) {
      return { success: false, status: "rejected", error: `Manifold bet failed: ${e}` };
    }
  }

  async cancelOrder(): Promise<boolean> {
    // Manifold bets are instant (AMM), cannot cancel
    return false;
  }

  estimateTrade(order: TradeRequest, orderBook?: OrderBook): TradeEstimate {
    const warnings: string[] = [];
    let currentPrice = 50;

    if (orderBook && orderBook.midpoint !== null) {
      currentPrice = orderBook.midpoint;
    }

    // AMM: price impact estimation (simplified CPMM)
    const pricePerShare = currentPrice / 100;
    const estimatedShares = pricePerShare > 0 ? order.amount / pricePerShare : 0;
    const fees = 0; // Manifold has no trading fees

    if (order.amount > 500) {
      warnings.push("Large AMM trade — expect significant price impact");
    }

    return {
      estimatedCost: order.amount,
      estimatedShares,
      estimatedAvgPrice: currentPrice,
      potentialPayout: estimatedShares,
      potentialProfit: estimatedShares - order.amount - fees,
      fees,
      warnings,
    };
  }
}
