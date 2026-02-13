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

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "open" && order.status !== "pending") {
    return NextResponse.json({ error: "Order cannot be cancelled" }, { status: 400 });
  }

  if (!order.platformOrderId) {
    // No platform order ID — just mark as cancelled locally
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "cancelled" },
    });
    return NextResponse.json({ ok: true });
  }

  const credentials = await getDecryptedCredentials(userId, order.platform);
  if (!credentials) {
    return NextResponse.json({ error: "no_credentials", platform: order.platform }, { status: 400 });
  }

  const adapter = getAdapter(order.platform);
  const success = await adapter.cancelOrder(order.platformOrderId, credentials);

  if (success) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "cancelled" },
    });
  }

  return NextResponse.json({ ok: success });
}
