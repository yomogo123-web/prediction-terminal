import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id || null;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    marketAId, marketASide, marketASource,
    marketBId, marketBSide, marketBSource,
    amount,
  } = body;

  if (!marketAId || !marketBId || !amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const [legAResult, legBResult] = await Promise.allSettled([
    executeLeg(userId, marketAId, marketASide, marketASource, amount / 2),
    executeLeg(userId, marketBId, marketBSide, marketBSource, amount / 2),
  ]);

  const legAStatus = legAResult.status === "fulfilled" ? legAResult.value : { status: "failed", error: String(legAResult.reason) };
  const legBStatus = legBResult.status === "fulfilled" ? legBResult.value : { status: "failed", error: String(legBResult.reason) };

  return NextResponse.json({
    legA: legAStatus,
    legB: legBStatus,
    bothSucceeded: legAStatus.status === "filled" && legBStatus.status === "filled",
  });
}

async function executeLeg(
  userId: string,
  marketId: string,
  side: string,
  platform: string,
  amount: number
): Promise<{ status: string; orderId: string; error?: string }> {
  const order = await prisma.order.create({
    data: { userId, marketId, platform, side, type: "market", amount, status: "pending" },
  });

  try {
    const fillPrice = 0.5;
    const shares = amount / fillPrice;

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "filled", fillPrice, shares },
    });

    const existingPos = await prisma.position.findUnique({
      where: { userId_marketId_side: { userId, marketId, side } },
    });

    if (existingPos) {
      const totalShares = existingPos.shares + shares;
      const newAvg = ((existingPos.shares * existingPos.avgCostBasis) + (shares * fillPrice)) / totalShares;
      await prisma.position.update({
        where: { id: existingPos.id },
        data: { shares: totalShares, avgCostBasis: newAvg },
      });
    } else {
      await prisma.position.create({
        data: { userId, marketId, platform, side, shares, avgCostBasis: fillPrice, currentPrice: fillPrice },
      });
    }

    return { status: "filled", orderId: order.id };
  } catch (e) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "rejected", errorMessage: String(e) },
    });
    return { status: "failed", orderId: order.id, error: String(e) };
  }
}
