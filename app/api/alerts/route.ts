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

  const alerts = await prisma.alert.findMany({ where: { userId } });
  return NextResponse.json(
    alerts.map((a) => ({
      id: a.id,
      marketId: a.marketId,
      condition: a.condition,
      threshold: a.threshold,
      active: a.active,
    }))
  );
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, marketId, condition, threshold } = await req.json();
  if (!marketId || !condition || threshold === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await prisma.alert.create({
    data: { id, userId, marketId, condition, threshold, active: true },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.alert.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, active } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.alert.updateMany({
    where: { id, userId },
    data: { active },
  });
  return NextResponse.json({ ok: true });
}
