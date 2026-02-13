import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id || null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const positions = await prisma.position.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    positions.map((p) => ({
      id: p.id,
      marketId: p.marketId,
      platform: p.platform,
      side: p.side,
      shares: p.shares,
      avgCostBasis: p.avgCostBasis,
      currentPrice: p.currentPrice,
      realizedPnl: p.realizedPnl,
      unrealizedPnl: (p.currentPrice - p.avgCostBasis) * p.shares / 100,
      createdAt: p.createdAt.toISOString(),
    }))
  );
}
