"use client";

import { useTerminalStore, useTopMovers } from "@/lib/store";

const sourceColors: Record<string, string> = {
  polymarket: "text-purple-400",
  kalshi: "text-blue-400",
  manifold: "text-green-400",
  predictit: "text-orange-400",
  mock: "text-terminal-muted",
};

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  if (v > 0) return `$${v}`;
  return "—";
}

export default function TrendingPanel() {
  const { gainers, losers } = useTopMovers();
  const selectMarket = useTerminalStore((s) => s.selectMarket);
  const selectedMarketId = useTerminalStore((s) => s.selectedMarketId);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-amber text-xs font-mono font-bold tracking-wider">
          TRENDING MARKETS
        </span>
        <span className="text-terminal-muted text-[10px] font-mono">24H CHANGE</span>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Gainers */}
        <div className="px-2 pt-1.5 pb-1">
          <div className="text-terminal-green text-[10px] font-mono font-bold px-1 mb-0.5">
            ▲ TOP GAINERS
          </div>
          {gainers.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMarket(m.id)}
              className={`w-full flex items-center justify-between px-1.5 py-1 text-xs font-mono transition-colors rounded-sm ${
                selectedMarketId === m.id
                  ? "bg-terminal-amber/10 border-l-2 border-l-terminal-amber"
                  : "hover:bg-terminal-green/5"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className={`text-[9px] ${sourceColors[m.source] || "text-terminal-muted"}`}>
                  {m.source === "polymarket" ? "POLY" : m.source === "kalshi" ? "KLSH" : m.source === "manifold" ? "MNFD" : m.source === "predictit" ? "PDIT" : "—"}
                </span>
                <span className="text-terminal-text truncate">
                  {m.title.length > 40 ? m.title.slice(0, 40) + "…" : m.title}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-terminal-text tabular-nums">
                  {m.probability.toFixed(1)}¢
                </span>
                <span className="text-terminal-green tabular-nums font-bold w-14 text-right">
                  +{m.change24h.toFixed(1)}
                </span>
                <span className="text-terminal-muted tabular-nums text-[10px] w-12 text-right">
                  {formatVolume(m.volume)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Losers */}
        <div className="px-2 pt-1 pb-1.5">
          <div className="text-terminal-red text-[10px] font-mono font-bold px-1 mb-0.5">
            ▼ TOP LOSERS
          </div>
          {losers.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMarket(m.id)}
              className={`w-full flex items-center justify-between px-1.5 py-1 text-xs font-mono transition-colors rounded-sm ${
                selectedMarketId === m.id
                  ? "bg-terminal-amber/10 border-l-2 border-l-terminal-amber"
                  : "hover:bg-terminal-red/5"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className={`text-[9px] ${sourceColors[m.source] || "text-terminal-muted"}`}>
                  {m.source === "polymarket" ? "POLY" : m.source === "kalshi" ? "KLSH" : m.source === "manifold" ? "MNFD" : m.source === "predictit" ? "PDIT" : "—"}
                </span>
                <span className="text-terminal-text truncate">
                  {m.title.length > 40 ? m.title.slice(0, 40) + "…" : m.title}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-terminal-text tabular-nums">
                  {m.probability.toFixed(1)}¢
                </span>
                <span className="text-terminal-red tabular-nums font-bold w-14 text-right">
                  {m.change24h.toFixed(1)}
                </span>
                <span className="text-terminal-muted tabular-nums text-[10px] w-12 text-right">
                  {formatVolume(m.volume)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
