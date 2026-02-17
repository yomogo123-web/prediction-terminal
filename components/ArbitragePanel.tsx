"use client";

import { useState } from "react";
import { useArbPairs, useTerminalStore } from "@/lib/store";
import { computeArbPnl } from "@/lib/arb-execution";
import { useSession } from "next-auth/react";

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
  const executeArb = useTerminalStore((s) => s.executeArb);
  const { data: session } = useSession();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [arbAmount, setArbAmount] = useState("20");
  const [executing, setExecuting] = useState(false);

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

            {/* EXEC ARB button */}
            {session && (
              <div className="mt-1 flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedIdx(expandedIdx === i ? null : i);
                  }}
                  className="text-[9px] font-mono font-bold px-2 py-0.5 border border-terminal-green/50 text-terminal-green hover:bg-terminal-green/10 transition-colors"
                >
                  EXEC ARB
                </button>
                {expandedIdx === i && (
                  <>
                    <input
                      type="number"
                      value={arbAmount}
                      onChange={(e) => setArbAmount(e.target.value)}
                      className="w-16 bg-terminal-bg border border-terminal-border px-1 py-0.5 text-[10px] text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
                      onClick={(e) => e.stopPropagation()}
                      placeholder="$"
                    />
                    {(() => {
                      const amt = parseFloat(arbAmount);
                      if (!amt || amt <= 0) return null;
                      const pnl = computeArbPnl(pair, amt);
                      return (
                        <span className="text-[9px] font-mono text-terminal-green">
                          +${pnl.bestCase}
                        </span>
                      );
                    })()}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const amt = parseFloat(arbAmount);
                        if (!amt || amt <= 0) return;
                        setExecuting(true);
                        await executeArb(pair, amt);
                        setExecuting(false);
                        setExpandedIdx(null);
                      }}
                      disabled={executing}
                      className="text-[9px] font-mono font-bold px-2 py-0.5 border border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 disabled:opacity-30 transition-colors"
                    >
                      {executing ? "..." : "CONFIRM"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
