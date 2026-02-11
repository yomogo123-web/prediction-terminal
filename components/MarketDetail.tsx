"use client";

import { useTerminalStore, useSelectedMarket } from "@/lib/store";
import { useEffect, useState } from "react";

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v}`;
}

export default function MarketDetail() {
  const selectedMarket = useSelectedMarket();
  const watchlist = useTerminalStore((s) => s.watchlist);
  const toggleWatchlist = useTerminalStore((s) => s.toggleWatchlist);
  const addAlert = useTerminalStore((s) => s.addAlert);
  const [alertCondition, setAlertCondition] = useState<"above" | "below">("above");
  const [alertThreshold, setAlertThreshold] = useState("");
  const [showAlertForm, setShowAlertForm] = useState(false);

  const isWatched = selectedMarket
    ? watchlist.includes(selectedMarket.id)
    : false;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key === "w" && selectedMarket) {
        toggleWatchlist(selectedMarket.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedMarket, toggleWatchlist]);

  const handleAddAlert = () => {
    if (!selectedMarket || !alertThreshold) return;
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    addAlert({
      id,
      marketId: selectedMarket.id,
      condition: alertCondition,
      threshold: parseFloat(alertThreshold),
      active: true,
    });
    setAlertThreshold("");
    setShowAlertForm(false);
  };

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
            <div className="text-terminal-muted">SOURCE</div>
            <div className="text-terminal-text uppercase">
              {selectedMarket.source}
            </div>
          </div>
          <div className="bg-terminal-bg p-2 border border-terminal-border">
            <div className="text-terminal-muted">CATEGORY</div>
            <div className="text-terminal-amber">{selectedMarket.category}</div>
          </div>
          <div className="bg-terminal-bg p-2 border border-terminal-border">
            <div className="text-terminal-muted">END DATE</div>
            <div className="text-terminal-text">
              {selectedMarket.endDate ? new Date(selectedMarket.endDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }) : "—"}
            </div>
          </div>
        </div>

        {/* Source link */}
        {selectedMarket.sourceUrl && (
          <a
            href={selectedMarket.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-1.5 text-center text-xs font-mono text-terminal-muted border border-terminal-border hover:text-terminal-text hover:border-terminal-text/50 transition-colors"
          >
            View on {selectedMarket.source.charAt(0).toUpperCase() + selectedMarket.source.slice(1)} →
          </a>
        )}

        {/* Description */}
        <div className="text-xs font-mono">
          <div className="text-terminal-muted mb-1">DESCRIPTION</div>
          <p className="text-terminal-text/80 leading-relaxed">
            {selectedMarket.description}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => toggleWatchlist(selectedMarket.id)}
            className={`flex-1 py-2 text-xs font-mono font-bold border transition-colors ${
              isWatched
                ? "border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10"
                : "border-terminal-green text-terminal-green hover:bg-terminal-green/10"
            }`}
          >
            {isWatched ? "★ UNWATCH (W)" : "☆ WATCH (W)"}
          </button>
          <button
            onClick={() => setShowAlertForm(!showAlertForm)}
            className="flex-1 py-2 text-xs font-mono font-bold border border-terminal-muted text-terminal-muted hover:border-terminal-text hover:text-terminal-text transition-colors"
          >
            {showAlertForm ? "✕ CANCEL" : "SET ALERT"}
          </button>
        </div>

        {/* Inline alert form */}
        {showAlertForm && (
          <div className="flex gap-2 items-center">
            <select
              value={alertCondition}
              onChange={(e) => setAlertCondition(e.target.value as "above" | "below")}
              className="bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text focus:outline-none focus:border-terminal-amber"
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
            <input
              type="number"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              placeholder="50"
              className="bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text w-16 focus:outline-none focus:border-terminal-amber"
            />
            <span className="text-terminal-muted text-xs">¢</span>
            <button
              onClick={handleAddAlert}
              disabled={!alertThreshold}
              className="px-3 py-1 text-xs bg-terminal-amber text-terminal-bg font-bold disabled:opacity-30"
            >
              SET
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
