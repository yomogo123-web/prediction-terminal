import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDomeClient } from "@/lib/dome";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id || null;
}

// GET: Return wallet info + P&L for linked Polymarket user
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { polymarketWallet: true },
  });

  if (!user?.polymarketWallet) {
    return NextResponse.json({ linked: false });
  }

  const dome = getDomeClient();
  if (!dome) {
    // No Dome configured but wallet is stored — return basic info
    return NextResponse.json({
      linked: true,
      wallet: user.polymarketWallet,
    });
  }

  try {
    const [walletInfo, pnlData] = await Promise.allSettled([
      dome.polymarket.wallet.getWallet({
        eoa: user.polymarketWallet,
        with_metrics: true,
      }),
      dome.polymarket.wallet.getWalletPnL({
        wallet_address: user.polymarketWallet,
        granularity: "month",
      }),
    ]);

    return NextResponse.json({
      linked: true,
      wallet: user.polymarketWallet,
      info: walletInfo.status === "fulfilled" ? walletInfo.value : null,
      pnl: pnlData.status === "fulfilled" ? pnlData.value : null,
    });
  } catch (e) {
    console.error("Dome wallet query failed:", e);
    return NextResponse.json({
      linked: true,
      wallet: user.polymarketWallet,
    });
  }
}
