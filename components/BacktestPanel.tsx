"use client";

import { useState } from "react";
import { useTerminalStore } from "@/lib/store";
import { BacktestStrategy } from "@/lib/backtest-types";

const categories = ["All", "Politics", "Sports", "Crypto", "Tech", "World Events"];

export default function BacktestPanel() {
  const backtestResult = useTerminalStore((s) => s.backtestResult);
  const backtestLoading = useTerminalStore((s) => s.backtestLoading);
  const runBacktest = useTerminalStore((s) => s.runBacktest);

  const [category, setCategory] = useState("All");
  const [minProb, setMinProb] = useState("10");
  const [maxProb, setMaxProb] = useState("90");
  const [holdingDays, setHoldingDays] = useState("30");

  const handleRun = () => {
    const strategy: BacktestStrategy = {
      categoryFilter: category === "All" ? null : category,
      minProbability: parseFloat(minProb) || 0,
      maxProbability: parseFloat(maxProb) || 100,
      holdingPeriodDays: parseInt(holdingDays) || 30,
      dateFrom: null,
      dateTo: null,
    };
    runBacktest(strategy);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-[9px] uppercase tracking-wider">Backtesting Engine</span>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Strategy builder */}
        <div className="p-3 border-b border-terminal-border space-y-2">
          <div className="text-[9px] text-terminal-muted uppercase tracking-wider">Strategy Parameters</div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] text-terminal-muted uppercase">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-0.5 bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[9px] text-terminal-muted uppercase">Hold (days)</label>
              <input
                type="number"
                value={holdingDays}
                onChange={(e) => setHoldingDays(e.target.value)}
                className="w-full mt-0.5 bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] text-terminal-muted uppercase">Min Prob (%)</label>
              <input
                type="number"
                value={minProb}
                onChange={(e) => setMinProb(e.target.value)}
                min="0" max="100"
                className="w-full mt-0.5 bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] text-terminal-muted uppercase">Max Prob (%)</label>
              <input
                type="number"
                value={maxProb}
                onChange={(e) => setMaxProb(e.target.value)}
                min="0" max="100"
                className="w-full mt-0.5 bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
              />
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={backtestLoading}
            className="w-full py-1.5 text-xs font-mono font-bold border border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 disabled:opacity-30 transition-colors"
          >
            {backtestLoading ? "RUNNING..." : "RUN BACKTEST"}
          </button>
        </div>

        {/* Results */}
        {backtestResult && (
          <div className="p-3 space-y-3">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-terminal-bg p-2 border border-terminal-border">
                <div className="text-terminal-muted text-[9px]">TRADES</div>
                <div className="text-terminal-text font-bold">{backtestResult.totalTrades}</div>
              </div>
              <div className="bg-terminal-bg p-2 border border-terminal-border">
                <div className="text-terminal-muted text-[9px]">WIN RATE</div>
                <div className="text-terminal-amber font-bold">{backtestResult.winRate}%</div>
              </div>
              <div className="bg-terminal-bg p-2 border border-terminal-border">
                <div className="text-terminal-muted text-[9px]">AVG RETURN</div>
                <div className={`font-bold ${backtestResult.avgReturn >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
                  {backtestResult.avgReturn >= 0 ? "+" : ""}{backtestResult.avgReturn}%
                </div>
              </div>
              <div className="bg-terminal-bg p-2 border border-terminal-border">
                <div className="text-terminal-muted text-[9px]">TOTAL RETURN</div>
                <div className={`font-bold ${backtestResult.totalReturn >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
                  ${backtestResult.totalReturn.toFixed(2)}
                </div>
              </div>
              <div className="bg-terminal-bg p-2 border border-terminal-border">
                <div className="text-terminal-muted text-[9px]">MAX DRAWDOWN</div>
                <div className="text-terminal-red font-bold">{backtestResult.maxDrawdown}%</div>
              </div>
              <div className="bg-terminal-bg p-2 border border-terminal-border">
                <div className="text-terminal-muted text-[9px]">SHARPE</div>
                <div className="text-terminal-text font-bold">
                  {backtestResult.sharpeRatio !== null ? backtestResult.sharpeRatio : "—"}
                </div>
              </div>
            </div>

            {/* Equity curve (text-based) */}
            {backtestResult.equityCurve.length > 1 && (
              <div className="space-y-1">
                <div className="text-[9px] text-terminal-muted uppercase tracking-wider">Equity Curve</div>
                <div className="h-16 flex items-end gap-px">
                  {backtestResult.equityCurve.slice(-40).map((pt, i) => {
                    const min = Math.min(...backtestResult.equityCurve.map((p) => p.equity));
                    const max = Math.max(...backtestResult.equityCurve.map((p) => p.equity));
                    const range = max - min || 1;
                    const height = ((pt.equity - min) / range) * 100;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t ${pt.equity >= 1000 ? "bg-terminal-green/60" : "bg-terminal-red/60"}`}
                        style={{ height: `${Math.max(2, height)}%` }}
                        title={`${pt.date}: $${pt.equity.toFixed(2)}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent trades */}
            {backtestResult.trades.length > 0 && (
              <div className="space-y-1">
                <div className="text-[9px] text-terminal-muted uppercase tracking-wider">
                  Recent Trades ({backtestResult.trades.length})
                </div>
                {backtestResult.trades.slice(-10).map((trade, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] font-mono border-b border-terminal-border/20 py-0.5">
                    <span className="text-terminal-text truncate flex-1">{trade.marketTitle.slice(0, 35)}</span>
                    <span className="text-terminal-muted mx-1">{trade.entryProb.toFixed(0)}¢</span>
                    <span className={`font-bold tabular-nums w-14 text-right ${
                      trade.returnPct >= 0 ? "text-terminal-green" : "text-terminal-red"
                    }`}>
                      {trade.returnPct >= 0 ? "+" : ""}{trade.returnPct}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
