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

  const watchlists = await prisma.watchlist.findMany({ where: { userId } });
  return NextResponse.json(watchlists.map((w) => w.marketId));
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { marketId } = await req.json();
  if (!marketId) return NextResponse.json({ error: "marketId required" }, { status: 400 });

  await prisma.watchlist.upsert({
    where: { userId_marketId: { userId, marketId } },
    create: { userId, marketId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { marketId } = await req.json();
  if (!marketId) return NextResponse.json({ error: "marketId required" }, { status: 400 });

  await prisma.watchlist.deleteMany({ where: { userId, marketId } });
  return NextResponse.json({ ok: true });
}
