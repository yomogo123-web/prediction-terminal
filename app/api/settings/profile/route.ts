import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id || null;
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.displayName === "string") {
    data.displayName = body.displayName.trim().slice(0, 30) || null;
  }

  if (typeof body.leaderboardOptIn === "boolean") {
    data.leaderboardOptIn = body.leaderboardOptIn;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data,
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, leaderboardOptIn: true, telegramChatId: true, telegramLinkedAt: true },
  });

  return NextResponse.json(user);
}
