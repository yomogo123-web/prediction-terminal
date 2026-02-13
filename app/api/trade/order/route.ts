import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/trading";
import { getDecryptedCredentials } from "@/lib/credentials";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id || null;
}

// Rate limit: track per-user order timestamps
const orderTimestamps = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = orderTimestamps.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < 60000); // last minute
  orderTimestamps.set(userId, recent);
  return recent.length < 10; // max 10 orders/minute
}

// GET: Order history
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      marketId: o.marketId,
      platform: o.platform,
      platformOrderId: o.platformOrderId,
      side: o.side,
      type: o.type,
      amount: o.amount,
      shares: o.shares,
      price: o.price,
      fillPrice: o.fillPrice,
      status: o.status,
      errorMessage: o.errorMessage,
      createdAt: o.createdAt.toISOString(),
    }))
  );
}

// POST: Place order
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: "Rate limit exceeded (max 10 orders/minute)" }, { status: 429 });
  }

  const body = await req.json();
  const { marketId, side, type, amount, limitPrice, source } = body;

  // Validate
  if (!marketId || !side || !type || amount === undefined || !source) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (amount < 0.10) {
    return NextResponse.json({ error: "Minimum order: $0.10" }, { status: 400 });
  }
  if (amount > 1000) {
    return NextResponse.json({ error: "Maximum order: $1,000" }, { status: 400 });
  }
  if (!["yes", "no"].includes(side)) {
    return NextResponse.json({ error: "Side must be 'yes' or 'no'" }, { status: 400 });
  }
  if (!["market", "limit"].includes(type)) {
    return NextResponse.json({ error: "Type must be 'market' or 'limit'" }, { status: 400 });
  }

  // Get credentials
  const credentials = await getDecryptedCredentials(userId, source);
  if (!credentials) {
    return NextResponse.json(
      { error: "no_credentials", platform: source },
      { status: 400 }
    );
  }

  // Create order record
  const order = await prisma.order.create({
    data: {
      userId,
      marketId,
      platform: source,
      side,
      type,
      amount,
      price: limitPrice || null,
      status: "pending",
    },
  });

  // Track rate limit
  const timestamps = orderTimestamps.get(userId) || [];
  timestamps.push(Date.now());
  orderTimestamps.set(userId, timestamps);

  // Execute trade
  const adapter = getAdapter(source);
  const result = await adapter.placeOrder(
    { marketId, side, type, amount, limitPrice },
    credentials
  );

  // Update order record
  await prisma.order.update({
    where: { id: order.id },
    data: {
      platformOrderId: result.orderId || null,
      status: result.status,
      fillPrice: result.fillPrice || null,
      shares: result.shares || null,
      errorMessage: result.error || null,
    },
  });

  // Upsert position if filled
  if (result.success && (result.status === "filled" || result.status === "partial")) {
    const fillPrice = result.fillPrice || (limitPrice ? limitPrice : 50);
    const shares = result.shares || (amount / (fillPrice / 100));

    try {
      const existing = await prisma.position.findUnique({
        where: { userId_marketId_side: { userId, marketId, side } },
      });

      if (existing) {
        const totalShares = existing.shares + shares;
        const newAvgCost = (existing.avgCostBasis * existing.shares + fillPrice * shares) / totalShares;
        await prisma.position.update({
          where: { id: existing.id },
          data: {
            shares: totalShares,
            avgCostBasis: newAvgCost,
            currentPrice: fillPrice,
          },
        });
      } else {
        await prisma.position.create({
          data: {
            userId,
            marketId,
            platform: source,
            side,
            shares,
            avgCostBasis: fillPrice,
            currentPrice: fillPrice,
          },
        });
      }
    } catch (e) {
      console.error("Failed to upsert position:", e);
    }
  }

  return NextResponse.json({
    success: result.success,
    orderId: order.id,
    status: result.status,
    error: result.error,
    fillPrice: result.fillPrice,
    shares: result.shares,
  });
}
