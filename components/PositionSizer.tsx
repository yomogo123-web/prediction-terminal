"use client";

import { useState, useEffect, useMemo } from "react";
import { computeKelly } from "@/lib/kelly";
import { useSelectedMarket, useAIEdge, useTerminalStore } from "@/lib/store";

export default function PositionSizer() {
  const selectedMarket = useSelectedMarket();
  const aiEdge = useAIEdge();
  const setOrderFormAmount = useTerminalStore((s) => s.setOrderFormAmount);
  const [collapsed, setCollapsed] = useState(true);
  const [bankroll, setBankroll] = useState(() => {
    if (typeof window === "undefined") return "1000";
    return localStorage.getItem("predict_bankroll") || "1000";
  });
  const [trueProb, setTrueProb] = useState("");

  // Persist bankroll
  useEffect(() => {
    if (typeof window !== "undefined" && bankroll) {
      localStorage.setItem("predict_bankroll", bankroll);
    }
  }, [bankroll]);

  // Pre-fill true probability from AI edge
  useEffect(() => {
    if (!selectedMarket) return;
    const ai = aiEdge.get(selectedMarket.id);
    if (ai) {
      setTrueProb(ai.aiProbability.toFixed(1));
    } else {
      setTrueProb("");
    }
  }, [selectedMarket?.id, aiEdge]);

  const kelly = useMemo(() => {
    const br = parseFloat(bankroll);
    const tp = parseFloat(trueProb);
    const mp = selectedMarket?.probability;
    if (!br || !tp || !mp || br <= 0 || tp <= 0 || tp >= 100 || mp <= 0 || mp >= 100) return null;
    return computeKelly(br, tp, mp);
  }, [bankroll, trueProb, selectedMarket?.probability]);

  if (!selectedMarket) return null;

  return (
    <div className="bg-terminal-bg border border-terminal-border">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[9px] text-terminal-muted uppercase tracking-wider hover:text-terminal-text transition-colors"
      >
        <span>Kelly Position Sizer</span>
        <span>{collapsed ? "+" : "-"}</span>
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] text-terminal-muted uppercase tracking-wider">Bankroll ($)</label>
              <input
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(e.target.value)}
                className="w-full mt-0.5 bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] text-terminal-muted uppercase tracking-wider">True Prob (%)</label>
              <input
                type="number"
                value={trueProb}
                onChange={(e) => setTrueProb(e.target.value)}
                placeholder={selectedMarket.probability.toFixed(1)}
                min="1"
                max="99"
                className="w-full mt-0.5 bg-terminal-bg border border-terminal-border px-2 py-1 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
              />
            </div>
          </div>

          {kelly && kelly.edge > 0 ? (
            <div className="space-y-1 text-[10px] font-mono border-t border-terminal-border/50 pt-2">
              <div className="flex justify-between">
                <span className="text-terminal-muted">Edge</span>
                <span className="text-terminal-green">+{kelly.edge}pp</span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted">EV/dollar</span>
                <span className={kelly.ev > 0 ? "text-terminal-green" : "text-terminal-red"}>
                  {kelly.ev > 0 ? "+" : ""}{kelly.ev.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-terminal-border/50 pt-1 mt-1 space-y-1">
                {([
                  ["Full Kelly", kelly.fullKelly],
                  ["Half Kelly", kelly.halfKelly],
                  ["Quarter Kelly", kelly.quarterKelly],
                ] as [string, number][]).map(([label, amount]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-terminal-muted">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-terminal-amber font-bold">${amount.toFixed(2)}</span>
                      <button
                        onClick={() => setOrderFormAmount(amount.toFixed(2))}
                        className="px-1.5 py-0.5 text-[8px] border border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 transition-colors"
                      >
                        USE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-terminal-border/50 pt-1">
                <span className="text-terminal-muted">Max Loss</span>
                <span className="text-terminal-red">${kelly.maxLoss.toFixed(2)}</span>
              </div>
            </div>
          ) : kelly && kelly.edge <= 0 ? (
            <div className="text-[10px] font-mono text-terminal-red border-t border-terminal-border/50 pt-2">
              No positive edge — Kelly says don&#39;t bet (edge: {kelly.edge}pp)
            </div>
          ) : trueProb ? (
            <div className="text-[10px] font-mono text-terminal-muted border-t border-terminal-border/50 pt-2">
              Enter valid probabilities to calculate
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
