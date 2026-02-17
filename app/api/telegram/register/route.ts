import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id || null;
}

export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = randomBytes(16).toString("hex");

  await prisma.user.update({
    where: { id: userId },
    data: { telegramChatId: `pending:${token}` },
  });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "PredictTerminalBot";
  const linkUrl = `https://t.me/${botUsername}?start=${token}`;

  return NextResponse.json({ token, linkUrl });
}

export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: userId },
    data: { telegramChatId: null, telegramLinkedAt: null },
  });

  return NextResponse.json({ ok: true });
}
