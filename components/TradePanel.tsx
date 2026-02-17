"use client";

import { useTerminalStore, useSelectedMarket } from "@/lib/store";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import PositionSizer from "./PositionSizer";

export default function TradePanel() {
  const { data: session } = useSession();
  const selectedMarket = useSelectedMarket();
  const credentialStatuses = useTerminalStore((s) => s.credentialStatuses);
  const polymarketLinked = useTerminalStore((s) => s.polymarketLinked);
  const orderFormSide = useTerminalStore((s) => s.orderFormSide);
  const orderFormType = useTerminalStore((s) => s.orderFormType);
  const orderFormAmount = useTerminalStore((s) => s.orderFormAmount);
  const orderFormLimitPrice = useTerminalStore((s) => s.orderFormLimitPrice);
  const tradeEstimate = useTerminalStore((s) => s.tradeEstimate);
  const tradeSubmitting = useTerminalStore((s) => s.tradeSubmitting);
  const setOrderFormSide = useTerminalStore((s) => s.setOrderFormSide);
  const setOrderFormType = useTerminalStore((s) => s.setOrderFormType);
  const setOrderFormAmount = useTerminalStore((s) => s.setOrderFormAmount);
  const setOrderFormLimitPrice = useTerminalStore((s) => s.setOrderFormLimitPrice);
  const setTradeConfirmPending = useTerminalStore((s) => s.setTradeConfirmPending);
  const fetchTradeEstimate = useTerminalStore((s) => s.fetchTradeEstimate);
  const setShowCredentialsModal = useTerminalStore((s) => s.setShowCredentialsModal);

  if (!selectedMarket) return null;

  // Can't trade PredictIt or mock
  if (selectedMarket.source === "predictit" || selectedMarket.source === "mock") {
    return null;
  }

  const platformCred = credentialStatuses.find((c) => c.platform === selectedMarket.source);
  const hasCredentials = platformCred?.configured || (selectedMarket.source === "polymarket" && polymarketLinked);
  const isPolymarketWallet = selectedMarket.source === "polymarket" && polymarketLinked;

  // Fetch estimate when form changes
  useEffect(() => {
    const amount = parseFloat(orderFormAmount);
    if (!selectedMarket || isNaN(amount) || amount <= 0) return;

    const timer = setTimeout(() => {
      fetchTradeEstimate({
        marketId: selectedMarket.id,
        side: orderFormSide,
        type: orderFormType,
        amount,
        limitPrice: orderFormType === "limit" ? parseFloat(orderFormLimitPrice) || undefined : undefined,
        source: selectedMarket.source,
        clobTokenId: selectedMarket.clobTokenId,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedMarket?.id, orderFormSide, orderFormType, orderFormAmount, orderFormLimitPrice, fetchTradeEstimate]);

  const handlePlaceOrder = () => {
    const amount = parseFloat(orderFormAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (!hasCredentials) {
      setShowCredentialsModal(true);
      return;
    }

    setTradeConfirmPending({
      marketId: selectedMarket.id,
      side: orderFormSide,
      type: orderFormType,
      amount,
      limitPrice: orderFormType === "limit" ? parseFloat(orderFormLimitPrice) || undefined : undefined,
    });
  };

  const amount = parseFloat(orderFormAmount);
  const isValidAmount = !isNaN(amount) && amount >= 0.10 && amount <= 1000;

  return (
    <div className="bg-terminal-bg border border-terminal-border p-3 space-y-3">
      <div className="text-terminal-muted text-[9px] uppercase tracking-wider">Trade</div>

      {/* Side toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => setOrderFormSide("yes")}
          className={`flex-1 py-1.5 text-xs font-mono font-bold border transition-colors ${
            orderFormSide === "yes"
              ? "bg-terminal-green/20 border-terminal-green text-terminal-green"
              : "border-terminal-border text-terminal-muted hover:text-terminal-text"
          }`}
        >
          YES
        </button>
        <button
          onClick={() => setOrderFormSide("no")}
          className={`flex-1 py-1.5 text-xs font-mono font-bold border transition-colors ${
            orderFormSide === "no"
              ? "bg-terminal-red/20 border-terminal-red text-terminal-red"
              : "border-terminal-border text-terminal-muted hover:text-terminal-text"
          }`}
        >
          NO
        </button>
      </div>

      {/* Type toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => setOrderFormType("market")}
          className={`flex-1 py-1 text-[10px] font-mono border transition-colors ${
            orderFormType === "market"
              ? "bg-terminal-amber/20 border-terminal-amber text-terminal-amber"
              : "border-terminal-border text-terminal-muted hover:text-terminal-text"
          }`}
        >
          MARKET
        </button>
        <button
          onClick={() => setOrderFormType("limit")}
          className={`flex-1 py-1 text-[10px] font-mono border transition-colors ${
            orderFormType === "limit"
              ? "bg-terminal-amber/20 border-terminal-amber text-terminal-amber"
              : "border-terminal-border text-terminal-muted hover:text-terminal-text"
          }`}
        >
          LIMIT
        </button>
      </div>

      {/* Amount input */}
      <div>
        <label className="text-[9px] text-terminal-muted uppercase tracking-wider">Amount ($)</label>
        <input
          type="number"
          value={orderFormAmount}
          onChange={(e) => setOrderFormAmount(e.target.value)}
          placeholder="10.00"
          min="0.10"
          max="1000"
          step="0.01"
          className="w-full mt-0.5 bg-terminal-bg border border-terminal-border px-2 py-1.5 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
        />
      </div>

      {/* Limit price input */}
      {orderFormType === "limit" && (
        <div>
          <label className="text-[9px] text-terminal-muted uppercase tracking-wider">Limit Price (¢)</label>
          <input
            type="number"
            value={orderFormLimitPrice}
            onChange={(e) => setOrderFormLimitPrice(e.target.value)}
            placeholder="50"
            min="1"
            max="99"
            step="1"
            className="w-full mt-0.5 bg-terminal-bg border border-terminal-border px-2 py-1.5 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
          />
        </div>
      )}

      {/* Estimate display */}
      {tradeEstimate && isValidAmount && (
        <div className="space-y-1 text-[10px] font-mono border-t border-terminal-border/50 pt-2">
          <div className="flex justify-between">
            <span className="text-terminal-muted">Est. Shares</span>
            <span className="text-terminal-text">{tradeEstimate.estimatedShares.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-muted">Avg Price</span>
            <span className="text-terminal-text">{tradeEstimate.estimatedAvgPrice.toFixed(1)}¢</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-muted">Payout (if YES)</span>
            <span className="text-terminal-green">${tradeEstimate.potentialPayout.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-muted">Profit</span>
            <span className={tradeEstimate.potentialProfit >= 0 ? "text-terminal-green" : "text-terminal-red"}>
              {tradeEstimate.potentialProfit >= 0 ? "+" : ""}${tradeEstimate.potentialProfit.toFixed(2)}
            </span>
          </div>
          {tradeEstimate.fees > 0 && (
            <div className="flex justify-between">
              <span className="text-terminal-muted">Fees</span>
              <span className="text-terminal-muted">${tradeEstimate.fees.toFixed(2)}</span>
            </div>
          )}
          {tradeEstimate.warnings.map((w, i) => (
            <div key={i} className="text-terminal-amber text-[9px]">{w}</div>
          ))}
        </div>
      )}

      {/* Action button */}
      {!session ? (
        <div className="text-center text-[10px] text-terminal-muted py-2">
          Sign in to trade
        </div>
      ) : !hasCredentials ? (
        <button
          onClick={() => setShowCredentialsModal(true)}
          className="w-full py-2 text-xs font-mono font-bold border border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 transition-colors"
        >
          {selectedMarket.source === "polymarket" ? "CONNECT WALLET" : `CONFIGURE ${selectedMarket.source.toUpperCase()}`}
        </button>
      ) : (
        <>
          <button
            onClick={handlePlaceOrder}
            disabled={!isValidAmount || tradeSubmitting}
            className={`w-full py-2 text-xs font-mono font-bold border transition-colors disabled:opacity-30 ${
              orderFormSide === "yes"
                ? "border-terminal-green text-terminal-green hover:bg-terminal-green/10"
                : "border-terminal-red text-terminal-red hover:bg-terminal-red/10"
            }`}
          >
            {tradeSubmitting ? "SUBMITTING..." : `PLACE ${orderFormType.toUpperCase()} ORDER`}
          </button>
          {isPolymarketWallet && (
            <div className="text-center text-[9px] text-terminal-muted mt-1">
              ROUTED VIA DOME
            </div>
          )}
        </>
      )}
      {/* Position Sizer */}
      <PositionSizer />
    </div>
  );
}
