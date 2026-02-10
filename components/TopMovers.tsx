"use client";

import { useTerminalStore, useTopMovers } from "@/lib/store";

export default function TopMovers() {
  const { gainers, losers } = useTopMovers();
  const selectMarket = useTerminalStore((s) => s.selectMarket);

  return (
    <div className="flex gap-4 px-3 py-1.5 text-xs font-mono border-b border-terminal-border bg-terminal-panel/50">
      <div className="flex items-center gap-2">
        <span className="text-terminal-green font-bold">▲ TOP</span>
        {gainers.slice(0, 3).map((m) => (
          <button
            key={m.id}
            onClick={() => selectMarket(m.id)}
            className="flex items-center gap-1 hover:bg-terminal-green/10 px-1 transition-colors"
          >
            <span className="text-terminal-text truncate max-w-[120px]">
              {m.title.length > 20 ? m.title.slice(0, 20) + "…" : m.title}
            </span>
            <span className="text-terminal-green tabular-nums font-bold">
              +{m.change24h.toFixed(1)}
            </span>
          </button>
        ))}
      </div>

      <span className="text-terminal-border">│</span>

      <div className="flex items-center gap-2">
        <span className="text-terminal-red font-bold">▼ BOT</span>
        {losers.slice(0, 3).map((m) => (
          <button
            key={m.id}
            onClick={() => selectMarket(m.id)}
            className="flex items-center gap-1 hover:bg-terminal-red/10 px-1 transition-colors"
          >
            <span className="text-terminal-text truncate max-w-[120px]">
              {m.title.length > 20 ? m.title.slice(0, 20) + "…" : m.title}
            </span>
            <span className="text-terminal-red tabular-nums font-bold">
              {m.change24h.toFixed(1)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
