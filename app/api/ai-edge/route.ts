import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AIEdgePrediction } from "@/lib/types";
import { prisma } from "@/lib/prisma";

interface MarketInput {
  id: string;
  title: string;
  description: string;
  category: string;
  probability: number;
  volume: number;
  change24h: number;
  source: string;
}

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const SYSTEM_PROMPT = `You are a prediction market analyst. Given a batch of prediction markets with their current probabilities, estimate what the TRUE probability should be based on your knowledge.

For each market, provide:
- aiProbability: your estimated true probability (0-100)
- confidence: "low", "medium", or "high" based on how confident you are
- reasoning: a single concise sentence explaining your estimate

Respond ONLY with a JSON array. No markdown, no code fences, no explanation outside the array. Example:
[{"id":"abc","aiProbability":65,"confidence":"medium","reasoning":"Recent polling data suggests higher likelihood than market implies."}]`;

function buildUserPrompt(markets: MarketInput[]): string {
  const lines = markets.map(
    (m) =>
      `- ID: ${m.id} | "${m.title}" | Category: ${m.category} | Market: ${m.probability.toFixed(1)}% | Vol: $${Math.round(m.volume)} | 24h: ${m.change24h >= 0 ? "+" : ""}${m.change24h.toFixed(1)}pp`
  );
  return `Analyze these ${markets.length} prediction markets. For each, estimate the true probability independently, then note divergences from the current market price.\n\n${lines.join("\n")}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json([], { status: 200 });
  }

  // Check DB for recent predictions (persistent cache, survives cold starts)
  try {
    const cutoff = new Date(Date.now() - CACHE_TTL);
    const recent = await prisma.aiPrediction.findMany({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    if (recent.length > 0) {
      const cached: AIEdgePrediction[] = recent.map((r) => ({
        marketId: r.marketId,
        aiProbability: r.aiProbability,
        marketProbability: r.marketProbability,
        divergence: r.divergence,
        confidence: r.confidence as AIEdgePrediction["confidence"],
        reasoning: r.reasoning,
      }));
      return NextResponse.json(cached);
    }
  } catch (e) {
    console.warn("Failed to check AI prediction cache:", e);
  }

  let markets: MarketInput[];
  try {
    const body = await request.json();
    markets = body.markets;
    if (!Array.isArray(markets) || markets.length === 0) {
      return NextResponse.json([]);
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Limit to top 20 by volume
  const batch = markets
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 20);

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(batch),
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json([]);
    }

    let parsed: Array<{ id: string; aiProbability: number; confidence: string; reasoning: string }>;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      // Try extracting JSON from potential markdown fences
      const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return NextResponse.json([]);
      parsed = JSON.parse(jsonMatch[0]);
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json([]);
    }

    const marketMap = new Map(batch.map((m) => [m.id, m]));
    const predictions: AIEdgePrediction[] = [];

    for (const item of parsed) {
      const market = marketMap.get(item.id);
      if (!market) continue;

      const aiProb = Math.max(0, Math.min(100, Number(item.aiProbability) || market.probability));
      const confidence = (["low", "medium", "high"].includes(item.confidence) ? item.confidence : "low") as AIEdgePrediction["confidence"];

      predictions.push({
        marketId: item.id,
        aiProbability: Math.round(aiProb * 10) / 10,
        marketProbability: market.probability,
        divergence: Math.round((aiProb - market.probability) * 10) / 10,
        confidence,
        reasoning: String(item.reasoning || "").slice(0, 200),
      });
    }

    // Persist predictions to DB (fire-and-forget)
    prisma.aiPrediction.createMany({
      data: predictions.map((p) => {
        const market = marketMap.get(p.marketId);
        return {
          marketId: p.marketId,
          marketTitle: market?.title || "",
          source: market?.source || "unknown",
          aiProbability: p.aiProbability,
          marketProbability: p.marketProbability,
          divergence: p.divergence,
          confidence: p.confidence,
          reasoning: p.reasoning,
        };
      }),
    }).catch((err) => console.error("Failed to persist AI predictions:", err));

    return NextResponse.json(predictions);
  } catch (e) {
    console.error("AI Edge API error:", e);
    return NextResponse.json([], { status: 200 });
  }
}
