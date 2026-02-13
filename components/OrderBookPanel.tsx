"use client";

import { useTerminalStore, useSelectedMarket } from "@/lib/store";
import { useEffect } from "react";
import { OrderBookLevel } from "@/lib/trading-types";

export default function OrderBookPanel() {
  const selectedMarket = useSelectedMarket();
  const orderBook = useTerminalStore((s) => s.orderBook);
  const orderBookLoading = useTerminalStore((s) => s.orderBookLoading);
  const fetchOrderBook = useTerminalStore((s) => s.fetchOrderBook);

  // Fetch order book when market changes, auto-refresh every 2s for CLOB
  useEffect(() => {
    if (!selectedMarket) return;
    fetchOrderBook(selectedMarket.id, selectedMarket.source, selectedMarket.clobTokenId);

    if (selectedMarket.source === "polymarket" || selectedMarket.source === "kalshi") {
      const interval = setInterval(() => {
        fetchOrderBook(selectedMarket.id, selectedMarket.source, selectedMarket.clobTokenId);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedMarket?.id, selectedMarket?.source, selectedMarket?.clobTokenId, fetchOrderBook]);

  if (!selectedMarket) return null;

  // PredictIt: no order book
  if (selectedMarket.source === "predictit" || selectedMarket.source === "mock") {
    return (
      <div className="bg-terminal-bg border border-terminal-border p-3">
        <div className="text-terminal-muted text-[9px] uppercase tracking-wider mb-2">Order Book</div>
        <div className="text-center py-4">
          <span className="text-terminal-red text-xs font-mono font-bold">TRADING NOT AVAILABLE</span>
          <div className="text-terminal-muted text-[10px] mt-1">
            {selectedMarket.source === "predictit" ? "PredictIt has no public trading API" : "Mock markets cannot be traded"}
          </div>
        </div>
      </div>
    );
  }

  // AMM view for Manifold
  if (selectedMarket.source === "manifold") {
    return (
      <div className="bg-terminal-bg border border-terminal-border p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-terminal-muted text-[9px] uppercase tracking-wider">AMM Pool</span>
          <span className="text-[9px] font-mono text-terminal-muted">MANIFOLD</span>
        </div>
        {orderBookLoading ? (
          <div className="text-center py-3 text-[10px] text-terminal-amber animate-pulse">Loading...</div>
        ) : orderBook ? (
          <div className="space-y-2 text-[10px] font-mono">
            <div className="flex justify-between">
              <span className="text-terminal-muted">YES Price</span>
              <span className="text-terminal-green font-bold">
                {orderBook.midpoint !== null ? `${orderBook.midpoint.toFixed(1)}¢` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">NO Price</span>
              <span className="text-terminal-red font-bold">
                {orderBook.midpoint !== null ? `${(100 - orderBook.midpoint).toFixed(1)}¢` : "—"}
              </span>
            </div>
            {orderBook.bids.length > 0 && (
              <div className="flex justify-between border-t border-terminal-border/50 pt-1">
                <span className="text-terminal-muted">Pool Liquidity</span>
                <span className="text-terminal-text">
                  {orderBook.bids[0].size >= 1000
                    ? `${(orderBook.bids[0].size / 1000).toFixed(1)}K`
                    : orderBook.bids[0].size.toFixed(0)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-3 text-[10px] text-terminal-muted">No pool data</div>
        )}
      </div>
    );
  }

  // CLOB order book for Polymarket/Kalshi
  const maxSize = orderBook
    ? Math.max(
        ...orderBook.bids.map((b) => b.size),
        ...orderBook.asks.map((a) => a.size),
        1
      )
    : 1;

  return (
    <div className="bg-terminal-bg border border-terminal-border p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-terminal-muted text-[9px] uppercase tracking-wider">Order Book</span>
        <span className="text-[9px] font-mono text-terminal-muted">
          {selectedMarket.source.toUpperCase()} CLOB
        </span>
      </div>

      {orderBookLoading && !orderBook ? (
        <div className="text-center py-4 text-[10px] text-terminal-amber animate-pulse">Loading order book...</div>
      ) : orderBook && (orderBook.bids.length > 0 || orderBook.asks.length > 0) ? (
        <div className="space-y-0.5">
          {/* Header */}
          <div className="flex text-[8px] text-terminal-muted uppercase tracking-wider pb-1">
            <span className="flex-1">Price</span>
            <span className="flex-1 text-right">Size</span>
          </div>

          {/* Asks (reversed so lowest ask is at bottom) */}
          {[...orderBook.asks].reverse().map((ask, i) => (
            <OrderBookRow key={`ask-${i}`} level={ask} side="ask" maxSize={maxSize} />
          ))}

          {/* Spread */}
          <div className="flex items-center justify-center py-1 border-y border-terminal-border/30">
            <span className="text-[10px] font-mono">
              <span className="text-terminal-muted">Spread: </span>
              <span className="text-terminal-amber font-bold">
                {orderBook.spread !== null ? `${orderBook.spread.toFixed(1)}¢` : "—"}
              </span>
              <span className="text-terminal-muted mx-2">│</span>
              <span className="text-terminal-muted">Mid: </span>
              <span className="text-terminal-text">
                {orderBook.midpoint !== null ? `${orderBook.midpoint.toFixed(1)}¢` : "—"}
              </span>
            </span>
          </div>

          {/* Bids */}
          {orderBook.bids.map((bid, i) => (
            <OrderBookRow key={`bid-${i}`} level={bid} side="bid" maxSize={maxSize} />
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-[10px] text-terminal-muted">No order book data</div>
      )}
    </div>
  );
}

function OrderBookRow({ level, side, maxSize }: { level: OrderBookLevel; side: "bid" | "ask"; maxSize: number }) {
  const widthPct = (level.size / maxSize) * 100;
  const isBid = side === "bid";

  return (
    <div className="relative flex text-[10px] font-mono py-0.5">
      {/* Depth bar */}
      <div
        className={`absolute inset-0 ${isBid ? "bg-terminal-green/10" : "bg-terminal-red/10"}`}
        style={{ width: `${widthPct}%`, [isBid ? "left" : "right"]: 0 }}
      />
      <span className={`flex-1 relative z-10 ${isBid ? "text-terminal-green" : "text-terminal-red"}`}>
        {level.price.toFixed(1)}¢
      </span>
      <span className="flex-1 text-right relative z-10 text-terminal-text">
        {level.size >= 1000 ? `${(level.size / 1000).toFixed(1)}K` : level.size.toFixed(0)}
      </span>
    </div>
  );
}
