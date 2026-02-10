"use client";

import { useTerminalStore, useSelectedMarket } from "@/lib/store";
import { useEffect } from "react";

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v}`;
}

export default function MarketDetail() {
  const selectedMarket = useSelectedMarket();
  const watchlist = useTerminalStore((s) => s.watchlist);
  const toggleWatchlist = useTerminalStore((s) => s.toggleWatchlist);

  const isWatched = selectedMarket
    ? watchlist.includes(selectedMarket.id)
    : false;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT"
      )
        return;
      if (e.key === "w" && selectedMarket) {
        toggleWatchlist(selectedMarket.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedMarket, toggleWatchlist]);

  if (!selectedMarket) {
    return (
      <div className="h-full flex items-center justify-center text-terminal-muted text-sm font-mono">
        No market selected
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-auto">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-xs font-mono">
          MARKET DETAIL
        </span>
        <span className="text-terminal-muted text-xs font-mono">
          {selectedMarket.id.toUpperCase()}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Title */}
        <h2 className="text-terminal-text text-sm font-mono font-bold leading-tight">
          {selectedMarket.title}
        </h2>

        {/* Large probability display */}
        <div className="flex items-baseline gap-3">
          <span
            className={`text-4xl font-mono font-bold tabular-nums ${
              selectedMarket.change24h >= 0
                ? "text-terminal-green"
                : "text-terminal-red"
            }`}
          >
            {selectedMarket.probability.toFixed(1)}
            <span className="text-lg">¢</span>
          </span>
          <span
            className={`text-sm font-mono ${
              selectedMarket.change24h >= 0
                ? "text-terminal-green"
                : "text-terminal-red"
            }`}
          >
            {selectedMarket.change24h >= 0 ? "▲" : "▼"}{" "}
            {Math.abs(selectedMarket.change24h).toFixed(1)} (24h)
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-terminal-bg p-2 border border-terminal-border">
            <div className="text-terminal-muted">VOLUME</div>
            <div className="text-terminal-text">
              {formatVolume(selectedMarket.volume)}
            </div>
          </div>
          <div className="bg-terminal-bg p-2 border border-terminal-border">
            <div className="text-terminal-muted">STATUS</div>
            <div className="text-terminal-green uppercase">
              {selectedMarket.status}
            </div>
          </div>
          <div className="bg-terminal-bg p-2 border border-terminal-border">
            <div className="text-terminal-muted">CATEGORY</div>
            <div className="text-terminal-amber">{selectedMarket.category}</div>
          </div>
          <div className="bg-terminal-bg p-2 border border-terminal-border">
            <div className="text-terminal-muted">END DATE</div>
            <div className="text-terminal-text">
              {new Date(selectedMarket.endDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="text-xs font-mono">
          <div className="text-terminal-muted mb-1">DESCRIPTION</div>
          <p className="text-terminal-text/80 leading-relaxed">
            {selectedMarket.description}
          </p>
        </div>

        {/* Watchlist button */}
        <button
          onClick={() => toggleWatchlist(selectedMarket.id)}
          className={`w-full py-2 text-xs font-mono font-bold border transition-colors ${
            isWatched
              ? "border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10"
              : "border-terminal-green text-terminal-green hover:bg-terminal-green/10"
          }`}
        >
          {isWatched ? "★ REMOVE FROM WATCHLIST (W)" : "☆ ADD TO WATCHLIST (W)"}
        </button>
      </div>
    </div>
  );
}
