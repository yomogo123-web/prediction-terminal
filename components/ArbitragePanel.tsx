"use client";

import { useArbPairs, useTerminalStore } from "@/lib/store";

const sourceLabels: Record<string, { label: string; color: string }> = {
  polymarket: { label: "POLY", color: "text-purple-400" },
  kalshi: { label: "KLSH", color: "text-blue-400" },
  manifold: { label: "MNFD", color: "text-green-400" },
  predictit: { label: "PDIT", color: "text-orange-400" },
  mock: { label: "MOCK", color: "text-terminal-muted" },
};

export default function ArbitragePanel() {
  const pairs = useArbPairs();
  const selectMarket = useTerminalStore((s) => s.selectMarket);

  if (pairs.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center px-3 py-1.5 border-b border-terminal-border">
          <span className="text-terminal-muted text-[9px] uppercase tracking-wider">
            Cross-Source Arbitrage
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono">
          No arbitrage opportunities detected
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-[9px] uppercase tracking-wider">
          Cross-Source Arbitrage
        </span>
        <span className="text-terminal-amber text-[9px] font-bold">
          {pairs.length} PAIRS
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        {pairs.map((pair, i) => (
          <div
            key={`${pair.marketA.id}-${pair.marketB.id}`}
            className="px-3 py-2 lg:py-2 min-h-[44px] lg:min-h-0 border-b border-terminal-border/30 hover:bg-terminal-panel/80"
          >
            <div className="flex items-center gap-1 text-[10px] text-terminal-muted mb-1">
              <span className="text-terminal-amber font-bold">#{i + 1}</span>
              <span>SPREAD</span>
              <span className="text-terminal-green font-bold tabular-nums">
                {pair.spread.toFixed(1)}¢
              </span>
              <span className="ml-auto">SIM {(pair.similarity * 100).toFixed(0)}%</span>
            </div>

            {/* Market A - higher price */}
            <div className="flex items-center gap-1 text-xs font-mono mb-0.5">
              <span
                onClick={() => selectMarket(pair.marketA.id)}
                className={`flex-shrink-0 text-[10px] w-8 cursor-pointer ${sourceLabels[pair.marketA.source]?.color || ""}`}
              >
                {sourceLabels[pair.marketA.source]?.label}
              </span>
              <span
                onClick={() => selectMarket(pair.marketA.id)}
                className="truncate flex-1 text-terminal-text cursor-pointer hover:text-terminal-amber"
              >
                {pair.marketA.title.slice(0, 45)}
              </span>
              <span className="flex-shrink-0 text-terminal-green tabular-nums font-bold">
                {pair.marketA.probability.toFixed(1)}¢
              </span>
              {pair.marketA.sourceUrl && (
                <a
                  href={pair.marketA.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 text-[9px] text-terminal-muted hover:text-terminal-amber"
                  title="View on source"
                >
                  ↗
                </a>
              )}
            </div>

            {/* Market B - lower price */}
            <div className="flex items-center gap-1 text-xs font-mono">
              <span
                onClick={() => selectMarket(pair.marketB.id)}
                className={`flex-shrink-0 text-[10px] w-8 cursor-pointer ${sourceLabels[pair.marketB.source]?.color || ""}`}
              >
                {sourceLabels[pair.marketB.source]?.label}
              </span>
              <span
                onClick={() => selectMarket(pair.marketB.id)}
                className="truncate flex-1 text-terminal-text cursor-pointer hover:text-terminal-amber"
              >
                {pair.marketB.title.slice(0, 45)}
              </span>
              <span className="flex-shrink-0 text-terminal-red tabular-nums font-bold">
                {pair.marketB.probability.toFixed(1)}¢
              </span>
              {pair.marketB.sourceUrl && (
                <a
                  href={pair.marketB.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 text-[9px] text-terminal-muted hover:text-terminal-amber"
                  title="View on source"
                >
                  ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
