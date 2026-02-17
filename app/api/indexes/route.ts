import { NextRequest, NextResponse } from "next/server";
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

  const indexes = await prisma.marketIndex.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(indexes);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, marketIds } = body as { name: string; marketIds: string[] };

  if (!name?.trim() || !marketIds?.length) {
    return NextResponse.json({ error: "Name and at least one market required" }, { status: 400 });
  }

  const index = await prisma.marketIndex.create({
    data: {
      userId,
      name: name.trim(),
      items: {
        create: marketIds.map((marketId) => ({
          marketId,
          weight: 1.0,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(index);
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id } = body as { id: string };

  await prisma.marketIndex.deleteMany({
    where: { id, userId },
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, addMarketId, removeMarketId, updateWeight } = body as {
    id: string;
    addMarketId?: string;
    removeMarketId?: string;
    updateWeight?: { marketId: string; weight: number };
  };

  const index = await prisma.marketIndex.findFirst({
    where: { id, userId },
  });
  if (!index) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (addMarketId) {
    await prisma.marketIndexItem.create({
      data: { indexId: id, marketId: addMarketId, weight: 1.0 },
    });
  }

  if (removeMarketId) {
    await prisma.marketIndexItem.deleteMany({
      where: { indexId: id, marketId: removeMarketId },
    });
  }

  if (updateWeight) {
    await prisma.marketIndexItem.updateMany({
      where: { indexId: id, marketId: updateWeight.marketId },
      data: { weight: updateWeight.weight },
    });
  }

  const updated = await prisma.marketIndex.findUnique({
    where: { id },
    include: { items: true },
  });

  return NextResponse.json(updated);
}
