import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id || null;
}

// GET: Return credential statuses (configured true/false per platform)
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const credentials = await prisma.platformCredential.findMany({
    where: { userId },
    select: { platform: true },
  });

  const configuredPlatforms = new Set(credentials.map((c) => c.platform));
  const statuses = ["polymarket", "kalshi", "manifold"].map((platform) => ({
    platform,
    configured: configuredPlatforms.has(platform),
  }));

  return NextResponse.json(statuses);
}

// POST: Save encrypted credentials for a platform
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform, credentials } = await req.json();
  if (!platform || !credentials) {
    return NextResponse.json({ error: "Missing platform or credentials" }, { status: 400 });
  }

  if (!["polymarket", "kalshi", "manifold"].includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  try {
    const payload = JSON.stringify(credentials);
    const { encrypted, iv, tag } = encrypt(payload);

    await prisma.platformCredential.upsert({
      where: { userId_platform: { userId, platform } },
      update: { encryptedPayload: encrypted, iv, tag },
      create: { userId, platform, encryptedPayload: encrypted, iv, tag },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to save credentials:", e);
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }
}

// DELETE: Remove credentials for a platform
export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform } = await req.json();
  if (!platform) return NextResponse.json({ error: "platform required" }, { status: 400 });

  await prisma.platformCredential.deleteMany({ where: { userId, platform } });
  return NextResponse.json({ ok: true });
}
