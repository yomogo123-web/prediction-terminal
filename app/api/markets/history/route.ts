import { NextRequest, NextResponse } from "next/server";
import { PricePoint } from "@/lib/types";

const CLOB_API = "https://clob.polymarket.com";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${CLOB_API}/prices-history?market=${encodeURIComponent(token)}&interval=max&fidelity=60`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) throw new Error(`CLOB API returned ${res.status}`);

    const data = await res.json();
    const history: PricePoint[] = (data.history || []).map(
      (point: { t: number; p: number }) => ({
        time: point.t,
        probability: Math.round(point.p * 10000) / 100, // 0-1 → 0-100
      })
    );

    return NextResponse.json(history);
  } catch (error) {
    console.error("Failed to fetch price history:", error);
    return NextResponse.json([], { status: 502 });
  }
}
