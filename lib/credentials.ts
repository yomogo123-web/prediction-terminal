import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export async function getDecryptedCredentials(userId: string, platform: string): Promise<Record<string, string> | null> {
  // First check env vars as fallback (single-user deployment)
  const envCreds = getEnvCredentials(platform);
  if (envCreds) return envCreds;

  const cred = await prisma.platformCredential.findUnique({
    where: { userId_platform: { userId, platform } },
  });
  if (!cred) return null;

  try {
    const decrypted = decrypt(cred.encryptedPayload, cred.iv, cred.tag);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

function getEnvCredentials(platform: string): Record<string, string> | null {
  if (platform === "polymarket" && process.env.POLYMARKET_API_KEY) {
    return {
      apiKey: process.env.POLYMARKET_API_KEY,
      apiSecret: process.env.POLYMARKET_API_SECRET || "",
      passphrase: process.env.POLYMARKET_PASSPHRASE || "",
    };
  }
  if (platform === "kalshi" && process.env.KALSHI_EMAIL) {
    return {
      email: process.env.KALSHI_EMAIL,
      password: process.env.KALSHI_PASSWORD || "",
    };
  }
  if (platform === "manifold" && process.env.MANIFOLD_API_KEY) {
    return { apiKey: process.env.MANIFOLD_API_KEY };
  }
  return null;
}
