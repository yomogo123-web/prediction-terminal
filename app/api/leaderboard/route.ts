import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  // Public endpoint - no auth required to view
  const users = await prisma.user.findMany({
    where: { leaderboardOptIn: true },
    select: {
      displayName: true,
      orders: {
        where: { status: { in: ["filled", "partial"] } },
        select: { id: true, amount: true, fillPrice: true, side: true, marketId: true },
      },
      positions: {
        select: { shares: true, avgCostBasis: true, currentPrice: true, realizedPnl: true, side: true },
      },
    },
  });

  const leaderboard = users.map((user) => {
    const totalTrades = user.orders.length;
    let totalPnl = 0;
    let wins = 0;

    for (const pos of user.positions) {
      const unrealized = pos.shares * (pos.currentPrice - pos.avgCostBasis);
      totalPnl += unrealized + pos.realizedPnl;
      if (unrealized + pos.realizedPnl > 0) wins++;
    }

    const winRate = user.positions.length > 0
      ? (wins / user.positions.length) * 100
      : null;

    return {
      displayName: user.displayName || "Anonymous Trader",
      totalTrades,
      winRate: winRate !== null ? Math.round(winRate * 10) / 10 : null,
      totalPnl: Math.round(totalPnl * 100) / 100,
      positionCount: user.positions.length,
    };
  });

  // Sort by total P&L descending
  leaderboard.sort((a, b) => b.totalPnl - a.totalPnl);

  // Add rank
  const ranked = leaderboard.slice(0, 50).map((entry, i) => ({
    ...entry,
    rank: i + 1,
  }));

  return NextResponse.json(ranked);
}
