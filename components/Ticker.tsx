"use client";

import { useMemo } from "react";
import { useTerminalStore } from "@/lib/store";

export default function Ticker() {
  const markets = useTerminalStore((s) => s.markets);

  // Limit ticker to top 100 markets by volume
  const tickerItems = useMemo(() => {
    return [...markets]
      .filter((m) => m.status === "active")
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 100);
  }, [markets]);

  return (
    <div className="h-6 lg:h-7 bg-terminal-panel border-t border-terminal-border overflow-hidden relative">
      <div
        className="whitespace-nowrap h-full flex items-center"
        style={{
          display: "inline-flex",
          animation: "ticker-scroll 600s linear infinite",
        }}
      >
        {[...tickerItems, ...tickerItems].map((market, i) => (
          <span
            key={`${market.id}-${i}`}
            className="inline-flex items-center gap-1 lg:gap-1.5 mx-2 lg:mx-4 text-[10px] lg:text-xs font-mono flex-shrink-0"
          >
            <span className="text-terminal-muted">
              {market.title.length > 20
                ? market.title.slice(0, 20) + "…"
                : market.title}
            </span>
            <span
              className={`font-bold tabular-nums ${
                market.change24h >= 0
                  ? "text-terminal-green"
                  : "text-terminal-red"
              }`}
            >
              {market.probability.toFixed(1)}¢
            </span>
            <span
              className={`tabular-nums ${
                market.change24h >= 0
                  ? "text-terminal-green"
                  : "text-terminal-red"
              }`}
            >
              {market.change24h >= 0 ? "+" : ""}
              {market.change24h.toFixed(1)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
