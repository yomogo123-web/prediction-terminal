import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/trading";

export async function POST(req: Request) {
  const body = await req.json();
  const { marketId, side, type, amount, limitPrice, source, clobTokenId } = body;

  if (!marketId || !side || !type || amount === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const adapter = getAdapter(source || "polymarket");

  // Fetch current order book for better estimate
  let orderBook;
  try {
    orderBook = await adapter.getOrderBook({ marketId, clobTokenId, source });
  } catch {
    // Estimate without order book
  }

  const estimate = adapter.estimateTrade(
    { marketId, side, type, amount, limitPrice },
    orderBook
  );

  return NextResponse.json(estimate);
}
