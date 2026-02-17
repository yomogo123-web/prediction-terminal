"use client";

import { useState } from "react";
import { useTerminalStore } from "@/lib/store";

type SortKey = "rank" | "totalTrades" | "winRate" | "totalPnl";

export default function LeaderboardPanel() {
  const leaderboard = useTerminalStore((s) => s.leaderboard);
  const leaderboardLoading = useTerminalStore((s) => s.leaderboardLoading);
  const [sortBy, setSortBy] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(key === "rank");
    }
  };

  const sorted = [...leaderboard].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "rank": cmp = a.rank - b.rank; break;
      case "totalTrades": cmp = a.totalTrades - b.totalTrades; break;
      case "winRate": cmp = (a.winRate ?? -1) - (b.winRate ?? -1); break;
      case "totalPnl": cmp = a.totalPnl - b.totalPnl; break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const indicator = (key: SortKey) => {
    if (sortBy !== key) return "";
    return sortAsc ? " ▲" : " ▼";
  };

  if (leaderboardLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center px-3 py-1.5 border-b border-terminal-border">
          <span className="text-terminal-muted text-[9px] uppercase tracking-wider">Leaderboard</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono animate-pulse">
          Loading leaderboard...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-[9px] uppercase tracking-wider">Leaderboard</span>
        <span className="text-terminal-amber text-[9px] font-bold">
          {leaderboard.length} TRADERS
        </span>
      </div>

      {leaderboard.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono text-center p-4">
          No opted-in traders yet. Opt in via Settings to appear on the leaderboard.
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="sticky top-0 bg-terminal-panel z-10 flex text-terminal-muted text-[10px] font-mono border-b border-terminal-border px-3 py-1">
            <button onClick={() => handleSort("rank")} className="w-8 text-left hover:text-terminal-text">
              #{indicator("rank")}
            </button>
            <div className="flex-1 min-w-0 text-left">NAME</div>
            <button onClick={() => handleSort("totalTrades")} className="w-16 text-right hover:text-terminal-text">
              TRADES{indicator("totalTrades")}
            </button>
            <button onClick={() => handleSort("winRate")} className="w-16 text-right hover:text-terminal-text">
              WIN%{indicator("winRate")}
            </button>
            <button onClick={() => handleSort("totalPnl")} className="w-20 text-right hover:text-terminal-text">
              P&L{indicator("totalPnl")}
            </button>
          </div>

          {/* Rows */}
          {sorted.map((entry) => (
            <div
              key={entry.userId}
              className="flex items-center px-3 py-1.5 text-[10px] font-mono border-b border-terminal-border/30 hover:bg-terminal-panel/80"
            >
              <span className="w-8 text-terminal-amber font-bold">{entry.rank}</span>
              <span className="flex-1 min-w-0 text-terminal-text truncate">{entry.displayName}</span>
              <span className="w-16 text-right text-terminal-muted tabular-nums">{entry.totalTrades}</span>
              <span className="w-16 text-right tabular-nums text-terminal-muted">
                {entry.winRate !== null ? `${entry.winRate}%` : "—"}
              </span>
              <span className={`w-20 text-right tabular-nums font-bold ${
                entry.totalPnl >= 0 ? "text-terminal-green" : "text-terminal-red"
              }`}>
                {entry.totalPnl >= 0 ? "+" : ""}${entry.totalPnl.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
