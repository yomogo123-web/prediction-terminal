import { ArbPair } from "./types";
import { TradeRequest } from "./trading-types";

export interface ArbTradeRequest {
  marketAId: string;
  marketASide: "yes" | "no";
  marketASource: string;
  marketBId: string;
  marketBSide: "yes" | "no";
  marketBSource: string;
  amount: number;
}

export interface ArbPnlEstimate {
  totalCost: number;
  bestCase: number;
  worstCase: number;
  fees: number;
  spreadCapture: number;
}

/**
 * Compute the two trade requests for an arb pair.
 * Buy YES on cheaper market (B), buy NO on expensive market (A).
 * Actually: buy YES on lower-priced market, buy NO on higher-priced market.
 */
export function computeArbTrades(pair: ArbPair, amount: number): [TradeRequest, TradeRequest] {
  const halfAmount = amount / 2;

  // Market B has lower probability — buy YES there
  const legA: TradeRequest = {
    marketId: pair.marketB.id,
    side: "yes",
    type: "market",
    amount: halfAmount,
  };

  // Market A has higher probability — buy NO there (or equivalently, sell YES)
  const legB: TradeRequest = {
    marketId: pair.marketA.id,
    side: "no",
    type: "market",
    amount: halfAmount,
  };

  return [legA, legB];
}

/**
 * Estimate P&L for an arbitrage trade.
 */
export function computeArbPnl(pair: ArbPair, amount: number): ArbPnlEstimate {
  const halfAmount = amount / 2;
  const spreadCents = pair.spread;

  // If YES on B wins: collect $1/share on B side, lose on A (NO loses)
  // If NO on A wins: collect $1/share on A side, lose on B (YES loses)
  // The spread represents the guaranteed profit margin

  const probA = pair.marketA.probability / 100;
  const probB = pair.marketB.probability / 100;

  // Shares bought: amount / price
  const sharesB_yes = halfAmount / probB; // YES shares on cheaper market
  const sharesA_no = halfAmount / (1 - probA); // NO shares on expensive market

  // Best case: capture full spread
  const bestCase = (spreadCents / 100) * Math.min(sharesB_yes, sharesA_no);

  // Worst case: lose full amount (if correlation breaks)
  const worstCase = -amount;

  // Estimated fees (2% per leg)
  const fees = amount * 0.02;

  const spreadCapture = spreadCents;

  return {
    totalCost: amount,
    bestCase: Math.round(bestCase * 100) / 100,
    worstCase,
    fees: Math.round(fees * 100) / 100,
    spreadCapture,
  };
}
