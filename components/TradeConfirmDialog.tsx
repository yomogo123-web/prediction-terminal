"use client";

import { useTerminalStore, useSelectedMarket } from "@/lib/store";

export default function TradeConfirmDialog() {
  const tradeConfirmPending = useTerminalStore((s) => s.tradeConfirmPending);
  const setTradeConfirmPending = useTerminalStore((s) => s.setTradeConfirmPending);
  const submitOrder = useTerminalStore((s) => s.submitOrder);
  const tradeEstimate = useTerminalStore((s) => s.tradeEstimate);
  const markets = useTerminalStore((s) => s.markets);

  if (!tradeConfirmPending) return null;

  const market = markets.find((m) => m.id === tradeConfirmPending.marketId);
  if (!market) return null;

  const handleConfirm = () => {
    submitOrder({
      marketId: tradeConfirmPending.marketId,
      side: tradeConfirmPending.side,
      type: tradeConfirmPending.type,
      amount: tradeConfirmPending.amount,
      limitPrice: tradeConfirmPending.limitPrice,
      source: market.source,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-terminal-panel border border-terminal-border w-[400px] max-w-[90vw] font-mono">
        {/* Header */}
        <div className="px-4 py-2 border-b border-terminal-border">
          <span className="text-terminal-amber text-xs font-bold uppercase tracking-wider">
            Confirm Trade
          </span>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="text-sm text-terminal-text leading-tight">
            {market.title}
          </div>

          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-terminal-muted">Platform</span>
              <span className="text-terminal-text uppercase">{market.source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">Side</span>
              <span className={tradeConfirmPending.side === "yes" ? "text-terminal-green font-bold" : "text-terminal-red font-bold"}>
                {tradeConfirmPending.side.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">Type</span>
              <span className="text-terminal-text uppercase">{tradeConfirmPending.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">Amount</span>
              <span className="text-terminal-text">${tradeConfirmPending.amount.toFixed(2)}</span>
            </div>
            {tradeConfirmPending.limitPrice && (
              <div className="flex justify-between">
                <span className="text-terminal-muted">Limit Price</span>
                <span className="text-terminal-text">{tradeConfirmPending.limitPrice}¢</span>
              </div>
            )}
            {tradeEstimate && (
              <>
                <div className="border-t border-terminal-border/50 pt-1.5 mt-1.5"></div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Est. Shares</span>
                  <span className="text-terminal-text">{tradeEstimate.estimatedShares.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Est. Avg Price</span>
                  <span className="text-terminal-text">{tradeEstimate.estimatedAvgPrice.toFixed(1)}¢</span>
                </div>
              </>
            )}
          </div>

          {/* Warning */}
          <div className="bg-terminal-amber/10 border border-terminal-amber/30 px-3 py-2 text-[10px] text-terminal-amber">
            This will execute a real trade. Funds at risk.
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 py-3 border-t border-terminal-border">
          <button
            onClick={() => setTradeConfirmPending(null)}
            className="flex-1 py-2 text-xs font-mono border border-terminal-border text-terminal-muted hover:text-terminal-text hover:border-terminal-text/50 transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 text-xs font-mono font-bold border border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 transition-colors"
          >
            CONFIRM TRADE
          </button>
        </div>
      </div>
    </div>
  );
}
