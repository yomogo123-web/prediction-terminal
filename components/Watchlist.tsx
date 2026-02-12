"use client";

import { useTerminalStore, useWatchlistMarkets } from "@/lib/store";

export default function Watchlist() {
  const watchlistMarkets = useWatchlistMarkets();
  const selectMarket = useTerminalStore((s) => s.selectMarket);
  const toggleWatchlist = useTerminalStore((s) => s.toggleWatchlist);
  const selectedMarketId = useTerminalStore((s) => s.selectedMarketId);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-xs font-mono">
          ★ WATCHLIST
        </span>
        <span className="text-terminal-muted text-xs font-mono">
          {watchlistMarkets.length} items
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {watchlistMarkets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-terminal-muted text-xs font-mono p-4 text-center">
            No markets in watchlist.
            <br />
            Press W to add selected market.
          </div>
        ) : (
          <div className="divide-y divide-terminal-border/30">
            {watchlistMarkets.map((market) => (
              <div
                key={market.id}
                onClick={() => selectMarket(market.id)}
                className={`flex items-center justify-between px-3 py-2 lg:py-2 min-h-[44px] lg:min-h-0 cursor-pointer transition-colors text-xs font-mono ${
                  market.id === selectedMarketId
                    ? "bg-terminal-amber/10"
                    : "hover:bg-terminal-panel/80"
                }`}
              >
                <div className="flex-1 min-w-0 mr-2">
                  <div className="text-terminal-text truncate">
                    {market.title}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`tabular-nums font-bold ${
                      market.change24h >= 0
                        ? "text-terminal-green"
                        : "text-terminal-red"
                    }`}
                  >
                    {market.probability.toFixed(1)}¢
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWatchlist(market.id);
                    }}
                    className="text-terminal-muted hover:text-terminal-red transition-colors p-1 lg:p-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Remove from watchlist"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
