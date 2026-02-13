import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/trading";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const marketId = searchParams.get("marketId");
  const source = searchParams.get("source") || "polymarket";
  const clobTokenId = searchParams.get("clobTokenId") || undefined;

  if (!marketId) {
    return NextResponse.json({ error: "marketId required" }, { status: 400 });
  }

  const adapter = getAdapter(source);
  const orderBook = await adapter.getOrderBook({ marketId, clobTokenId, source });

  return NextResponse.json(orderBook);
}
