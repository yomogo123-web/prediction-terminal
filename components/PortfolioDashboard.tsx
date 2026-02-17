"use client";

import { useTerminalStore } from "@/lib/store";
import { formatVolume } from "@/lib/format";

export default function PortfolioDashboard() {
  const portfolioStats = useTerminalStore((s) => s.portfolioStats);
  const portfolioLoading = useTerminalStore((s) => s.portfolioLoading);
  const markets = useTerminalStore((s) => s.markets);
  const selectMarket = useTerminalStore((s) => s.selectMarket);

  if (portfolioLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center px-3 py-1.5 border-b border-terminal-border">
          <span className="text-terminal-muted text-[9px] uppercase tracking-wider">Portfolio</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono animate-pulse">
          Loading portfolio...
        </div>
      </div>
    );
  }

  if (!portfolioStats) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center px-3 py-1.5 border-b border-terminal-border">
          <span className="text-terminal-muted text-[9px] uppercase tracking-wider">Portfolio</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono">
          Sign in and trade to see portfolio
        </div>
      </div>
    );
  }

  const s = portfolioStats;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-[9px] uppercase tracking-wider">Portfolio</span>
        <span className="text-terminal-amber text-[9px] font-bold">
          {s.openPositions} POSITIONS
        </span>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Top-level stats */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-terminal-bg p-2 border border-terminal-border">
            <div className="text-terminal-muted text-[9px]">TOTAL VALUE</div>
            <div className="text-terminal-text font-bold">{formatVolume(s.currentValue)}</div>
          </div>
          <div className="bg-terminal-bg p-2 border border-terminal-border">
            <div className="text-terminal-muted text-[9px]">TOTAL P&L</div>
            <div className={`font-bold ${s.totalPnl >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
              {s.totalPnl >= 0 ? "+" : ""}${s.totalPnl.toFixed(2)}
            </div>
          </div>
          <div className="bg-terminal-bg p-2 border border-terminal-border">
            <div className="text-terminal-muted text-[9px]">UNREALIZED</div>
            <div className={`font-bold ${s.unrealizedPnl >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
              {s.unrealizedPnl >= 0 ? "+" : ""}${s.unrealizedPnl.toFixed(2)}
            </div>
          </div>
          <div className="bg-terminal-bg p-2 border border-terminal-border">
            <div className="text-terminal-muted text-[9px]">REALIZED</div>
            <div className={`font-bold ${s.realizedPnl >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
              {s.realizedPnl >= 0 ? "+" : ""}${s.realizedPnl.toFixed(2)}
            </div>
          </div>
          <div className="bg-terminal-bg p-2 border border-terminal-border">
            <div className="text-terminal-muted text-[9px]">WIN RATE</div>
            <div className="text-terminal-amber font-bold">
              {s.winRate !== null ? `${s.winRate.toFixed(1)}%` : "—"}
            </div>
          </div>
          <div className="bg-terminal-bg p-2 border border-terminal-border">
            <div className="text-terminal-muted text-[9px]">TRADES</div>
            <div className="text-terminal-text font-bold">{s.totalTrades}</div>
          </div>
        </div>

        {/* Platform breakdown */}
        {s.byPlatform.length > 0 && (
          <div className="space-y-1">
            <div className="text-[9px] text-terminal-muted uppercase tracking-wider">By Platform</div>
            {s.byPlatform.map((p) => {
              const maxVal = Math.max(...s.byPlatform.map((x) => x.currentValue)) || 1;
              return (
                <div key={p.platform} className="text-[10px] font-mono space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-terminal-text uppercase">{p.platform}</span>
                    <span className="text-terminal-muted">{p.positionCount} pos · {formatVolume(p.currentValue)}</span>
                  </div>
                  <div className="h-1 bg-terminal-border/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-terminal-amber/60 rounded-full"
                      style={{ width: `${(p.currentValue / maxVal) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Position cards */}
        {s.positions.length > 0 && (
          <div className="space-y-1">
            <div className="text-[9px] text-terminal-muted uppercase tracking-wider">Positions</div>
            {s.positions.map((pos) => {
              const market = markets.find((m) => m.id === pos.marketId);
              return (
                <div
                  key={pos.id}
                  onClick={() => selectMarket(pos.marketId)}
                  className="bg-terminal-bg border border-terminal-border p-2 cursor-pointer hover:border-terminal-amber/50 transition-colors"
                >
                  <div className="text-xs font-mono text-terminal-text truncate">
                    {market?.title || pos.marketId}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono">
                    <span className={pos.side === "yes" ? "text-terminal-green" : "text-terminal-red"}>
                      {pos.side.toUpperCase()}
                    </span>
                    <span className="text-terminal-muted">
                      {pos.shares.toFixed(1)} @ {(pos.avgCostBasis * 100).toFixed(0)}¢
                    </span>
                    <span className="ml-auto">
                      <span className={pos.unrealizedPnl >= 0 ? "text-terminal-green" : "text-terminal-red"}>
                        {pos.unrealizedPnl >= 0 ? "+" : ""}${pos.unrealizedPnl.toFixed(2)}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
