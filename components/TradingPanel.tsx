"use client";

import { useTerminalStore } from "@/lib/store";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function TradingPanel() {
  const { data: session } = useSession();
  const orders = useTerminalStore((s) => s.orders);
  const positions = useTerminalStore((s) => s.positions);
  const markets = useTerminalStore((s) => s.markets);
  const fetchOrders = useTerminalStore((s) => s.fetchOrders);
  const fetchPositions = useTerminalStore((s) => s.fetchPositions);
  const cancelOrder = useTerminalStore((s) => s.cancelOrder);
  const selectMarket = useTerminalStore((s) => s.selectMarket);

  useEffect(() => {
    if (!session) return;
    fetchOrders();
    fetchPositions();
  }, [session, fetchOrders, fetchPositions]);

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center text-terminal-muted text-xs font-mono">
        Sign in to view trades
      </div>
    );
  }

  const getMarketTitle = (marketId: string) => {
    const m = markets.find((m) => m.id === marketId);
    return m ? m.title.slice(0, 40) + (m.title.length > 40 ? "..." : "") : marketId;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Positions section */}
      <div className="flex-1 overflow-auto border-b border-terminal-border">
        <div className="px-3 py-1.5 border-b border-terminal-border bg-terminal-panel sticky top-0">
          <span className="text-terminal-muted text-[9px] uppercase tracking-wider">
            Positions ({positions.length})
          </span>
        </div>
        {positions.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-terminal-muted text-[10px] font-mono">
            No open positions
          </div>
        ) : (
          <div className="divide-y divide-terminal-border/30">
            {positions.map((pos) => (
              <button
                key={pos.id}
                onClick={() => selectMarket(pos.marketId)}
                className="w-full text-left px-3 py-2 hover:bg-terminal-border/10 transition-colors"
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-terminal-text truncate flex-1 mr-2">
                    {getMarketTitle(pos.marketId)}
                  </span>
                  <span className={pos.side === "yes" ? "text-terminal-green" : "text-terminal-red"}>
                    {pos.side.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono mt-0.5">
                  <span className="text-terminal-muted">
                    {pos.shares.toFixed(1)} shares @ {pos.avgCostBasis.toFixed(1)}¢
                  </span>
                  <span className={pos.unrealizedPnl >= 0 ? "text-terminal-green" : "text-terminal-red"}>
                    {pos.unrealizedPnl >= 0 ? "+" : ""}${pos.unrealizedPnl.toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Order History section */}
      <div className="flex-1 overflow-auto">
        <div className="px-3 py-1.5 border-b border-terminal-border bg-terminal-panel sticky top-0">
          <span className="text-terminal-muted text-[9px] uppercase tracking-wider">
            Order History ({orders.length})
          </span>
        </div>
        {orders.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-terminal-muted text-[10px] font-mono">
            No orders yet
          </div>
        ) : (
          <div className="divide-y divide-terminal-border/30">
            {orders.map((order) => (
              <div
                key={order.id}
                className="px-3 py-2 text-[10px] font-mono"
              >
                <div className="flex items-center justify-between">
                  <span className="text-terminal-muted">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-terminal-text truncate flex-1 mr-2">
                    {getMarketTitle(order.marketId)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={order.side === "yes" ? "text-terminal-green" : "text-terminal-red"}>
                      {order.side.toUpperCase()}
                    </span>
                    <span className="text-terminal-muted">${order.amount.toFixed(2)}</span>
                  </span>
                </div>
                {(order.status === "open" || order.status === "pending") && (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    className="mt-1 text-[9px] text-terminal-red hover:text-terminal-red/80 transition-colors"
                  >
                    CANCEL
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "text-terminal-amber border-terminal-amber/30",
    open: "text-terminal-amber border-terminal-amber/30",
    filled: "text-terminal-green border-terminal-green/30",
    partial: "text-terminal-amber border-terminal-amber/30",
    cancelled: "text-terminal-muted border-terminal-border",
    rejected: "text-terminal-red border-terminal-red/30",
  };

  return (
    <span className={`text-[8px] font-mono px-1 py-0.5 border uppercase ${colors[status] || "text-terminal-muted border-terminal-border"}`}>
      {status}
    </span>
  );
}
