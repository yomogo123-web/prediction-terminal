"use client";

import { useState, useMemo } from "react";
import { useTerminalStore } from "@/lib/store";

export default function IndexPanel() {
  const marketIndexes = useTerminalStore((s) => s.marketIndexes);
  const indexesLoading = useTerminalStore((s) => s.indexesLoading);
  const createIndex = useTerminalStore((s) => s.createIndex);
  const deleteIndex = useTerminalStore((s) => s.deleteIndex);
  const markets = useTerminalStore((s) => s.markets);
  const selectMarket = useTerminalStore((s) => s.selectMarket);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarketIds, setSelectedMarketIds] = useState<string[]>([]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return markets
      .filter((m) => m.title.toLowerCase().includes(q))
      .slice(0, 5);
  }, [searchQuery, markets]);

  const handleCreate = async () => {
    if (!newName.trim() || selectedMarketIds.length === 0) return;
    await createIndex(newName.trim(), selectedMarketIds);
    setNewName("");
    setSelectedMarketIds([]);
    setShowCreate(false);
  };

  const computeIndexProb = (items: { marketId: string; weight: number }[]) => {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const item of items) {
      const market = markets.find((m) => m.id === item.marketId);
      if (market) {
        weightedSum += market.probability * item.weight;
        totalWeight += item.weight;
      }
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const computeIndexChange = (items: { marketId: string; weight: number }[]) => {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const item of items) {
      const market = markets.find((m) => m.id === item.marketId);
      if (market) {
        weightedSum += market.change24h * item.weight;
        totalWeight += item.weight;
      }
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  if (indexesLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center px-3 py-1.5 border-b border-terminal-border">
          <span className="text-terminal-muted text-[9px] uppercase tracking-wider">Custom Indexes</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono animate-pulse">
          Loading indexes...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-[9px] uppercase tracking-wider">Custom Indexes</span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-terminal-amber text-[9px] font-bold hover:text-terminal-amber/80"
        >
          {showCreate ? "CANCEL" : "+ CREATE"}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Create form */}
        {showCreate && (
          <div className="p-3 border-b border-terminal-border space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Index name..."
              className="w-full bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search markets to add..."
              className="w-full bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
            />
            {searchResults.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  if (!selectedMarketIds.includes(m.id)) {
                    setSelectedMarketIds([...selectedMarketIds, m.id]);
                  }
                  setSearchQuery("");
                }}
                className="w-full text-left px-2 py-1 text-[10px] font-mono text-terminal-text hover:bg-terminal-panel/80 truncate"
              >
                {m.title}
              </button>
            ))}
            {selectedMarketIds.length > 0 && (
              <div className="space-y-1">
                <div className="text-[9px] text-terminal-muted">Selected ({selectedMarketIds.length}):</div>
                {selectedMarketIds.map((id) => {
                  const m = markets.find((mk) => mk.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-terminal-text truncate">{m?.title || id}</span>
                      <button
                        onClick={() => setSelectedMarketIds(selectedMarketIds.filter((x) => x !== id))}
                        className="text-terminal-red ml-1 flex-shrink-0"
                      >
                        x
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || selectedMarketIds.length === 0}
              className="w-full py-1.5 text-xs font-mono font-bold border border-terminal-green text-terminal-green hover:bg-terminal-green/10 disabled:opacity-30 transition-colors"
            >
              CREATE INDEX
            </button>
          </div>
        )}

        {/* Index list */}
        {marketIndexes.length === 0 && !showCreate ? (
          <div className="flex-1 flex items-center justify-center p-4 text-terminal-muted text-xs font-mono text-center">
            No custom indexes yet. Create one to track a basket of markets.
          </div>
        ) : (
          marketIndexes.map((idx) => {
            const prob = computeIndexProb(idx.items);
            const change = computeIndexChange(idx.items);
            return (
              <div key={idx.id} className="px-3 py-2 border-b border-terminal-border/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-terminal-amber">{idx.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold tabular-nums ${
                      change >= 0 ? "text-terminal-green" : "text-terminal-red"
                    }`}>
                      {prob.toFixed(1)}¢
                    </span>
                    <span className={`text-[10px] font-mono tabular-nums ${
                      change >= 0 ? "text-terminal-green" : "text-terminal-red"
                    }`}>
                      {change >= 0 ? "+" : ""}{change.toFixed(1)}
                    </span>
                    <button
                      onClick={() => deleteIndex(idx.id)}
                      className="text-terminal-red text-[9px] hover:text-terminal-red/80"
                    >
                      DEL
                    </button>
                  </div>
                </div>
                <div className="space-y-0.5">
                  {idx.items.map((item) => {
                    const market = markets.find((m) => m.id === item.marketId);
                    if (!market) return null;
                    return (
                      <div
                        key={item.id}
                        onClick={() => selectMarket(item.marketId)}
                        className="flex items-center justify-between text-[10px] font-mono text-terminal-muted hover:text-terminal-text cursor-pointer"
                      >
                        <span className="truncate">{market.title.slice(0, 40)}</span>
                        <span className="tabular-nums ml-1 flex-shrink-0">{market.probability.toFixed(1)}¢</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
