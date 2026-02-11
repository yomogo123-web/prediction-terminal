"use client";

import { useState } from "react";
import { useTerminalStore, useSelectedMarket } from "@/lib/store";

export default function AlertPanel({ onClose }: { onClose: () => void }) {
  const selectedMarket = useSelectedMarket();
  const alerts = useTerminalStore((s) => s.alerts);
  const addAlert = useTerminalStore((s) => s.addAlert);
  const removeAlert = useTerminalStore((s) => s.removeAlert);
  const toggleAlert = useTerminalStore((s) => s.toggleAlert);
  const markets = useTerminalStore((s) => s.markets);
  const [condition, setCondition] = useState<"above" | "below" | "change">("above");
  const [threshold, setThreshold] = useState("");

  const handleAdd = () => {
    if (!selectedMarket || !threshold) return;
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    addAlert({
      id,
      marketId: selectedMarket.id,
      condition,
      threshold: parseFloat(threshold),
      active: true,
    });
    setThreshold("");
  };

  const getMarketTitle = (marketId: string) => {
    const m = markets.find((mk) => mk.id === marketId);
    return m ? m.title : marketId;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 font-mono">
      <div className="bg-terminal-panel border border-terminal-border w-[500px] max-w-[90vw] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border">
          <span className="text-terminal-amber text-xs font-bold uppercase tracking-wider">
            Alert Manager
          </span>
          <button onClick={onClose} className="text-terminal-muted hover:text-terminal-text text-xs">
            [ESC]
          </button>
        </div>

        {/* Create alert form */}
        {selectedMarket && (
          <div className="px-4 py-3 border-b border-terminal-border space-y-2">
            <div className="text-[10px] text-terminal-muted uppercase tracking-wider">
              New Alert for: <span className="text-terminal-text">{selectedMarket.title.slice(0, 50)}</span>
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as "above" | "below" | "change")}
                className="bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text focus:outline-none focus:border-terminal-amber"
              >
                <option value="above">Prob Above</option>
                <option value="below">Prob Below</option>
                <option value="change">24h Change {">="}</option>
              </select>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder={condition === "change" ? "5" : "50"}
                className="bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text w-20 focus:outline-none focus:border-terminal-amber"
              />
              <span className="text-terminal-muted text-xs">
                {condition === "change" ? "pts" : "¢"}
              </span>
              <button
                onClick={handleAdd}
                disabled={!threshold}
                className="px-3 py-1 text-xs bg-terminal-amber text-terminal-bg font-bold disabled:opacity-30 hover:bg-terminal-amber/90"
              >
                ADD
              </button>
            </div>
          </div>
        )}

        {/* Alert list */}
        <div className="flex-1 overflow-auto p-2">
          {alerts.length === 0 ? (
            <div className="text-terminal-muted text-xs text-center py-4">
              No alerts set. Select a market and add one above.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center gap-2 px-2 py-1.5 text-xs border-b border-terminal-border/30 ${
                  alert.active ? "text-terminal-text" : "text-terminal-muted opacity-50"
                }`}
              >
                <button
                  onClick={() => toggleAlert(alert.id)}
                  className={`flex-shrink-0 ${alert.active ? "text-terminal-green" : "text-terminal-muted"}`}
                >
                  {alert.active ? "●" : "○"}
                </button>
                <span className="truncate flex-1 min-w-0">
                  {getMarketTitle(alert.marketId).slice(0, 40)}
                </span>
                <span className="flex-shrink-0 text-terminal-amber">
                  {alert.condition === "above" ? ">" : alert.condition === "below" ? "<" : "Δ≥"}
                  {alert.threshold}
                </span>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="flex-shrink-0 text-terminal-red hover:text-terminal-red/80"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
