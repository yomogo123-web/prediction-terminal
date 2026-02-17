import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BacktestResult, BacktestStrategy, BacktestTrade } from "@/lib/backtest-types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const strategy: BacktestStrategy = body.strategy;

  if (!strategy) {
    return NextResponse.json({ error: "Strategy required" }, { status: 400 });
  }

  // Query resolved AI predictions as historical data source
  const where: Record<string, unknown> = {
    resolution: { not: null },
  };

  if (strategy.categoryFilter) {
    // We don't have category on AiPrediction, but we can filter by source
    // For now, include all resolved predictions
  }

  if (strategy.dateFrom) {
    where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), gte: new Date(strategy.dateFrom) };
  }
  if (strategy.dateTo) {
    where.createdAt = { ...((where.createdAt as Record<string, unknown>) || {}), lte: new Date(strategy.dateTo) };
  }

  const predictions = await prisma.aiPrediction.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  // Filter by probability range
  const filtered = predictions.filter((p) => {
    return p.marketProbability >= strategy.minProbability &&
           p.marketProbability <= strategy.maxProbability;
  });

  // Simulate trades
  const trades: BacktestTrade[] = [];
  let equity = 1000; // Start with $1000
  let maxEquity = equity;
  let maxDrawdown = 0;
  const equityCurve: { date: string; equity: number }[] = [
    { date: filtered[0]?.createdAt.toISOString().split("T")[0] || new Date().toISOString().split("T")[0], equity },
  ];

  for (const pred of filtered) {
    const entryProb = pred.marketProbability / 100;
    const isYes = pred.resolution === "yes";
    const outcome = isYes ? 1 : 0;

    // Bet size: fixed 5% of equity
    const betSize = equity * 0.05;
    // Buy at market probability
    const shares = betSize / entryProb;
    // Payout: shares * outcome (YES pays $1, NO pays $0)
    const payout = shares * outcome;
    const profit = payout - betSize;
    const returnPct = (profit / betSize) * 100;

    equity += profit;
    maxEquity = Math.max(maxEquity, equity);
    const drawdown = maxEquity > 0 ? ((maxEquity - equity) / maxEquity) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);

    trades.push({
      marketTitle: pred.marketTitle,
      entryProb: pred.marketProbability,
      exitProb: outcome * 100,
      resolution: pred.resolution || "unknown",
      returnPct: Math.round(returnPct * 10) / 10,
      date: pred.createdAt.toISOString().split("T")[0],
    });

    equityCurve.push({
      date: pred.createdAt.toISOString().split("T")[0],
      equity: Math.round(equity * 100) / 100,
    });
  }

  const wins = trades.filter((t) => t.returnPct > 0).length;
  const returns = trades.map((t) => t.returnPct);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const totalReturn = equity - 1000;

  // Sharpe ratio (simplified)
  let sharpeRatio: number | null = null;
  if (returns.length > 1) {
    const mean = avgReturn;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    sharpeRatio = stdDev > 0 ? Math.round((mean / stdDev) * 100) / 100 : null;
  }

  const result: BacktestResult = {
    strategy,
    trades: trades.slice(-50), // Last 50 trades
    totalTrades: trades.length,
    winRate: trades.length > 0 ? Math.round((wins / trades.length) * 1000) / 10 : 0,
    avgReturn: Math.round(avgReturn * 10) / 10,
    totalReturn: Math.round(totalReturn * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10) / 10,
    sharpeRatio,
    equityCurve,
  };

  return NextResponse.json(result);
}
