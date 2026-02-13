import { TradingAdapter, MarketRef } from "./adapter";
import { OrderBook, OrderBookLevel, TradeRequest, TradeResponse, TradeEstimate } from "../trading-types";

export class PolymarketAdapter implements TradingAdapter {
  async getOrderBook(market: MarketRef): Promise<OrderBook> {
    const tokenId = market.clobTokenId;
    if (!tokenId) {
      return { bids: [], asks: [], bestBid: null, bestAsk: null, spread: null, midpoint: null, source: "polymarket", type: "clob" };
    }

    try {
      const res = await fetch(`https://clob.polymarket.com/book?token_id=${tokenId}`);
      if (!res.ok) throw new Error(`Polymarket book API: ${res.status}`);
      const data = await res.json();

      const bids: OrderBookLevel[] = (data.bids || [])
        .map((b: { price: string; size: string }) => ({
          price: parseFloat(b.price) * 100,
          size: parseFloat(b.size),
        }))
        .sort((a: OrderBookLevel, b: OrderBookLevel) => b.price - a.price)
        .slice(0, 8);

      const asks: OrderBookLevel[] = (data.asks || [])
        .map((a: { price: string; size: string }) => ({
          price: parseFloat(a.price) * 100,
          size: parseFloat(a.size),
        }))
        .sort((a: OrderBookLevel, b: OrderBookLevel) => a.price - b.price)
        .slice(0, 8);

      const bestBid = bids.length > 0 ? bids[0].price : null;
      const bestAsk = asks.length > 0 ? asks[0].price : null;
      const spread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;
      const midpoint = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null;

      return { bids, asks, bestBid, bestAsk, spread, midpoint, source: "polymarket", type: "clob" };
    } catch (e) {
      console.warn("Polymarket order book fetch failed:", e);
      return { bids: [], asks: [], bestBid: null, bestAsk: null, spread: null, midpoint: null, source: "polymarket", type: "clob" };
    }
  }

  async placeOrder(order: TradeRequest, credentials: Record<string, string>): Promise<TradeResponse> {
    if (!credentials.apiKey || !credentials.apiSecret || !credentials.passphrase) {
      return { success: false, status: "rejected", error: "Missing Polymarket credentials" };
    }

    try {
      const side = order.side === "yes" ? "BUY" : "BUY"; // Both sides are BUY on respective token
      const price = order.type === "limit" && order.limitPrice
        ? (order.limitPrice / 100).toFixed(2)
        : undefined;

      const body: Record<string, unknown> = {
        tokenID: order.marketId,
        side,
        size: order.amount,
        type: order.type === "limit" ? "GTC" : "FOK",
      };
      if (price) body.price = price;

      const res = await fetch("https://clob.polymarket.com/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "POLY_API_KEY": credentials.apiKey,
          "POLY_API_SECRET": credentials.apiSecret,
          "POLY_PASSPHRASE": credentials.passphrase,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, status: "rejected", error: `Polymarket API error: ${errText}` };
      }

      const data = await res.json();
      return {
        success: true,
        orderId: data.orderID || data.id,
        status: data.status === "MATCHED" ? "filled" : "open",
        fillPrice: data.averagePrice ? parseFloat(data.averagePrice) * 100 : undefined,
        shares: data.size ? parseFloat(data.size) : undefined,
      };
    } catch (e) {
      return { success: false, status: "rejected", error: `Polymarket order failed: ${e}` };
    }
  }

  async cancelOrder(platformOrderId: string, credentials: Record<string, string>): Promise<boolean> {
    try {
      const res = await fetch("https://clob.polymarket.com/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "POLY_API_KEY": credentials.apiKey,
          "POLY_API_SECRET": credentials.apiSecret,
          "POLY_PASSPHRASE": credentials.passphrase,
        },
        body: JSON.stringify({ orderID: platformOrderId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  estimateTrade(order: TradeRequest, orderBook?: OrderBook): TradeEstimate {
    const warnings: string[] = [];
    let estimatedAvgPrice = 50;

    if (orderBook && order.type === "market") {
      const levels = order.side === "yes" ? orderBook.asks : orderBook.bids;
      if (levels.length > 0) {
        let remaining = order.amount;
        let totalCost = 0;
        let totalShares = 0;

        for (const level of levels) {
          const levelCostPerShare = level.price / 100;
          const maxSharesAtLevel = remaining / levelCostPerShare;
          const sharesAtLevel = Math.min(maxSharesAtLevel, level.size);
          totalCost += sharesAtLevel * levelCostPerShare;
          totalShares += sharesAtLevel;
          remaining -= sharesAtLevel * levelCostPerShare;
          if (remaining <= 0.001) break;
        }

        if (remaining > 0.01) warnings.push("Order may not fully fill — insufficient liquidity");
        estimatedAvgPrice = totalShares > 0 ? (totalCost / totalShares) * 100 : 50;

        const fees = order.amount * 0.002; // ~0.2% fee estimate
        return {
          estimatedCost: order.amount,
          estimatedShares: totalShares,
          estimatedAvgPrice,
          potentialPayout: totalShares * 1, // $1 per share if resolves YES
          potentialProfit: totalShares * 1 - order.amount - fees,
          fees,
          warnings,
        };
      }
    }

    if (order.type === "limit" && order.limitPrice) {
      estimatedAvgPrice = order.limitPrice;
    }

    const pricePerShare = estimatedAvgPrice / 100;
    const estimatedShares = pricePerShare > 0 ? order.amount / pricePerShare : 0;
    const fees = order.amount * 0.002;

    return {
      estimatedCost: order.amount,
      estimatedShares,
      estimatedAvgPrice,
      potentialPayout: estimatedShares,
      potentialProfit: estimatedShares - order.amount - fees,
      fees,
      warnings,
    };
  }
}
