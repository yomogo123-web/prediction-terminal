import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDomeClient } from "@/lib/dome";
import { PolymarketRouter } from "@dome-api/sdk";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id || null;
}

// POST: Link user wallet via Dome router
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dome = getDomeClient();
  if (!dome) {
    return NextResponse.json({ error: "Dome not configured" }, { status: 503 });
  }

  try {
    const { signerAddress, walletType } = await req.json();
    if (!signerAddress) {
      return NextResponse.json({ error: "signerAddress required" }, { status: 400 });
    }

    const apiKey = process.env.DOME_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Dome API key not configured" }, { status: 503 });
    }

    const router = new PolymarketRouter({ apiKey });

    // The actual wallet signing happens client-side.
    // Here we store the linked wallet address after client confirms linkage.
    // In a full integration, linkUser would be called with a signer on the client,
    // and the server stores the result.

    // Store the linked wallet on the user record
    await prisma.user.update({
      where: { id: userId },
      data: { polymarketWallet: signerAddress },
    });

    return NextResponse.json({
      ok: true,
      wallet: signerAddress,
      walletType: walletType || "eoa",
    });
  } catch (e) {
    console.error("Dome link failed:", e);
    return NextResponse.json({ error: "Failed to link wallet" }, { status: 500 });
  }
}
