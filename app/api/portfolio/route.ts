import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortfolioStats } from "@/lib/portfolio-types";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id || null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [positions, orders] = await Promise.all([
    prisma.position.findMany({ where: { userId } }),
    prisma.order.findMany({
      where: { userId, status: { in: ["filled", "partial"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  let totalInvested = 0;
  let currentValue = 0;
  let unrealizedPnl = 0;
  let realizedPnl = 0;

  const platformMap = new Map<string, { invested: number; currentValue: number; count: number }>();

  const positionDetails = positions.map((p) => {
    const invested = p.shares * p.avgCostBasis;
    const current = p.shares * p.currentPrice;
    const unrealized = current - invested;

    totalInvested += invested;
    currentValue += current;
    unrealizedPnl += unrealized;
    realizedPnl += p.realizedPnl;

    const plat = platformMap.get(p.platform) || { invested: 0, currentValue: 0, count: 0 };
    plat.invested += invested;
    plat.currentValue += current;
    plat.count += 1;
    platformMap.set(p.platform, plat);

    return {
      id: p.id,
      marketId: p.marketId,
      marketTitle: p.marketId,
      platform: p.platform,
      side: p.side,
      shares: p.shares,
      avgCostBasis: p.avgCostBasis,
      currentPrice: p.currentPrice,
      unrealizedPnl: unrealized,
      realizedPnl: p.realizedPnl,
    };
  });

  const filledOrders = orders.filter((o) => o.status === "filled");
  const wins = filledOrders.filter((o) => {
    const pos = positions.find((p) => p.marketId === o.marketId && p.side === o.side);
    return pos && pos.currentPrice > pos.avgCostBasis;
  });
  const winRate = filledOrders.length > 0 ? (wins.length / filledOrders.length) * 100 : null;

  const stats: PortfolioStats = {
    totalInvested: Math.round(totalInvested * 100) / 100,
    currentValue: Math.round(currentValue * 100) / 100,
    unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
    realizedPnl: Math.round(realizedPnl * 100) / 100,
    totalPnl: Math.round((unrealizedPnl + realizedPnl) * 100) / 100,
    winRate: winRate !== null ? Math.round(winRate * 10) / 10 : null,
    totalTrades: filledOrders.length,
    openPositions: positions.length,
    byPlatform: Array.from(platformMap.entries()).map(([platform, s]) => ({
      platform,
      invested: Math.round(s.invested * 100) / 100,
      currentValue: Math.round(s.currentValue * 100) / 100,
      positionCount: s.count,
    })),
    byCategory: [],
    positions: positionDetails,
  };

  return NextResponse.json(stats);
}
