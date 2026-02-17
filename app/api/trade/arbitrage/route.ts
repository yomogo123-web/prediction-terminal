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

  if (amount < 0.20 || amount > 2000) {
    return NextResponse.json({ error: "Amount must be between $0.20 and $2000" }, { status: 400 });
  }

  // Execute both legs via the main trade order endpoint
  const legHalf = Math.round(amount / 2 * 100) / 100;

  const [legAResult, legBResult] = await Promise.allSettled([
    executeViaTradeEndpoint(userId, marketAId, marketASide, marketASource, legHalf),
    executeViaTradeEndpoint(userId, marketBId, marketBSide, marketBSource, legHalf),
  ]);

  const legAStatus = legAResult.status === "fulfilled" ? legAResult.value : { status: "failed", error: String(legAResult.reason) };
  const legBStatus = legBResult.status === "fulfilled" ? legBResult.value : { status: "failed", error: String(legBResult.reason) };

  return NextResponse.json({
    legA: legAStatus,
    legB: legBStatus,
    bothSucceeded: legAStatus.status !== "failed" && legBStatus.status !== "failed",
  });
}

async function executeViaTradeEndpoint(
  userId: string,
  marketId: string,
  side: string,
  platform: string,
  amount: number
): Promise<{ status: string; orderId?: string; error?: string }> {
  // Create a pending order record
  const order = await prisma.order.create({
    data: { userId, marketId, platform, side, type: "market", amount, status: "pending" },
  });

  try {
    // Use internal fetch to the trade order endpoint which handles actual exchange execution
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/trade/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketId, side, type: "market", amount, source: platform }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Trade execution failed" }));
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "rejected", errorMessage: err.error || "Execution failed" },
      });
      return { status: "failed", orderId: order.id, error: err.error || "Execution failed" };
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "submitted" },
    });

    return { status: "submitted", orderId: order.id };
  } catch (e) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "rejected", errorMessage: e instanceof Error ? e.message : "Unknown error" },
    });
    return { status: "failed", orderId: order.id, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
