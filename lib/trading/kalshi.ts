import { TradingAdapter, MarketRef } from "./adapter";
import { OrderBook, OrderBookLevel, TradeRequest, TradeResponse, TradeEstimate } from "../trading-types";
import { getKalshiOrdersApi, getBuilderCode } from "../kalshi-sdk";

const KALSHI_API = "https://api.elections.kalshi.com/trade-api/v2";

export class KalshiAdapter implements TradingAdapter {
  async getOrderBook(market: MarketRef): Promise<OrderBook> {
    // Extract ticker from market ID (format: "kal-TICKER")
    const ticker = market.marketId.replace(/^kal-/, "");
    if (!ticker) {
      return { bids: [], asks: [], bestBid: null, bestAsk: null, spread: null, midpoint: null, source: "kalshi", type: "clob" };
    }

    try {
      const res = await fetch(`${KALSHI_API}/orderbook/ui/${ticker}`);
      if (!res.ok) throw new Error(`Kalshi book API: ${res.status}`);
      const data = await res.json();
      const book = data.orderbook || data;

      const bids: OrderBookLevel[] = (book.yes || [])
        .map((level: [number, number]) => ({
          price: level[0],
          size: level[1],
        }))
        .sort((a: OrderBookLevel, b: OrderBookLevel) => b.price - a.price)
        .slice(0, 8);

      const asks: OrderBookLevel[] = (book.no || [])
        .map((level: [number, number]) => ({
          price: 100 - level[0],
          size: level[1],
        }))
        .sort((a: OrderBookLevel, b: OrderBookLevel) => a.price - b.price)
        .slice(0, 8);

      const bestBid = bids.length > 0 ? bids[0].price : null;
      const bestAsk = asks.length > 0 ? asks[0].price : null;
      const spread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;
      const midpoint = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null;

      return { bids, asks, bestBid, bestAsk, spread, midpoint, source: "kalshi", type: "clob" };
    } catch (e) {
      console.warn("Kalshi order book fetch failed:", e);
      return { bids: [], asks: [], bestBid: null, bestAsk: null, spread: null, midpoint: null, source: "kalshi", type: "clob" };
    }
  }

  async placeOrder(order: TradeRequest, credentials: Record<string, string>): Promise<TradeResponse> {
    const ticker = order.marketId.replace(/^kal-/, "");

    // Convert USD amount to contract count: Kalshi count = number of contracts, not dollars
    // Each contract pays $1 on correct resolution. Price is in cents (0-100).
    const priceInCents = order.limitPrice || 50; // default to 50c if no limit price
    const pricePerContract = priceInCents / 100;
    const contractCount = Math.max(1, Math.floor(order.amount / pricePerContract));

    // Try RSA-PSS SDK auth first
    const ordersApi = getKalshiOrdersApi();
    if (ordersApi && credentials.authMethod === "rsa") {
      try {
        const createReq: {
          ticker: string;
          action: "buy";
          side: "yes" | "no";
          type?: "market" | "limit";
          count: number;
          yes_price?: number;
          no_price?: number;
        } = {
          ticker,
          action: "buy",
          side: order.side as "yes" | "no",
          type: order.type as "market" | "limit",
          count: contractCount,
        };
        if (order.type === "limit" && order.limitPrice) {
          if (order.side === "yes") createReq.yes_price = order.limitPrice;
          else createReq.no_price = order.limitPrice;
        }

        const resp = await ordersApi.createOrder(createReq as never);
        const data = resp.data;
        return {
          success: true,
          orderId: data.order?.order_id,
          status: data.order?.status === "executed" ? "filled" : "open",
          fillPrice: data.order?.yes_price,
          shares: data.order?.fill_count,
        };
      } catch (e) {
        return { success: false, status: "rejected", error: `Kalshi SDK order failed: ${e}` };
      }
    }

    // Fallback: legacy email/password auth
    if (!credentials.email || !credentials.password) {
      return { success: false, status: "rejected", error: "Missing Kalshi credentials" };
    }

    try {
      const authRes = await fetch(`${KALSHI_API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: credentials.email, password: credentials.password }),
      });
      if (!authRes.ok) {
        return { success: false, status: "rejected", error: "Kalshi authentication failed" };
      }
      const authData = await authRes.json();
      const token = authData.token;

      const body: Record<string, unknown> = {
        ticker,
        action: "buy",
        side: order.side,
        type: order.type,
        count: contractCount,
      };
      if (order.type === "limit" && order.limitPrice) {
        body.yes_price = order.side === "yes" ? order.limitPrice : undefined;
        body.no_price = order.side === "no" ? order.limitPrice : undefined;
      }
      const builderCode = getBuilderCode();
      if (builderCode) {
        body.builder_code = builderCode;
      }

      const res = await fetch(`${KALSHI_API}/portfolio/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, status: "rejected", error: `Kalshi API error: ${errText}` };
      }

      const data = await res.json();
      return {
        success: true,
        orderId: data.order?.order_id,
        status: data.order?.status === "executed" ? "filled" : "open",
        fillPrice: data.order?.avg_price,
        shares: data.order?.count,
      };
    } catch (e) {
      return { success: false, status: "rejected", error: `Kalshi order failed: ${e}` };
    }
  }

  async cancelOrder(platformOrderId: string, credentials: Record<string, string>): Promise<boolean> {
    // Try SDK auth first
    const ordersApi = getKalshiOrdersApi();
    if (ordersApi && credentials.authMethod === "rsa") {
      try {
        await ordersApi.cancelOrder(platformOrderId);
        return true;
      } catch {
        return false;
      }
    }

    // Fallback: legacy email/password
    try {
      const authRes = await fetch(`${KALSHI_API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: credentials.email, password: credentials.password }),
      });
      if (!authRes.ok) return false;
      const authData = await authRes.json();

      const res = await fetch(`${KALSHI_API}/portfolio/orders/${platformOrderId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authData.token}` },
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
        estimatedAvgPrice = levels[0].price;
        const totalAvailable = levels.reduce((sum, l) => sum + l.size, 0);
        if (order.amount > totalAvailable) {
          warnings.push("Order may not fully fill — insufficient liquidity");
        }
      }
    }

    if (order.type === "limit" && order.limitPrice) {
      estimatedAvgPrice = order.limitPrice;
    }

    const pricePerContract = estimatedAvgPrice / 100;
    const contracts = pricePerContract > 0 ? Math.floor(order.amount / pricePerContract) : 0;
    const estimatedCost = contracts * pricePerContract;
    const fees = estimatedCost * 0.01; // Kalshi ~1% fee

    return {
      estimatedCost,
      estimatedShares: contracts,
      estimatedAvgPrice,
      potentialPayout: contracts,
      potentialProfit: contracts - estimatedCost - fees,
      fees,
      warnings,
    };
  }
}
