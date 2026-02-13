import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Throttle resolution checking to once per 10 minutes
let lastResolutionCheck = 0;
const RESOLUTION_INTERVAL = 10 * 60 * 1000;

// GET — Returns accuracy stats for the UI panel
export async function GET() {
  try {
    const [resolved, pending] = await Promise.all([
      prisma.aiPrediction.findMany({
        where: { resolution: { not: null } },
        orderBy: { resolvedAt: "desc" },
        take: 20,
      }),
      prisma.aiPrediction.findMany({
        where: { resolution: null },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const allResolved = await prisma.aiPrediction.findMany({
      where: { resolution: { not: null } },
      select: { aiProbability: true, resolution: true, brierScore: true },
    });

    const totalPredictions = await prisma.aiPrediction.count();
    const totalResolved = allResolved.length;

    // Brier score (average of precomputed values)
    const brierScores = allResolved
      .map((r) => r.brierScore)
      .filter((s): s is number => s !== null);
    const avgBrierScore =
      brierScores.length > 0
        ? brierScores.reduce((a, b) => a + b, 0) / brierScores.length
        : null;

    // Hit rate: AI said >50% and resolved YES, or <50% and resolved NO
    let hits = 0;
    for (const r of allResolved) {
      const predictedYes = r.aiProbability > 50;
      const actualYes = r.resolution === "yes";
      if (predictedYes === actualYes) hits++;
    }
    const hitRate = totalResolved > 0 ? (hits / totalResolved) * 100 : null;

    // Calibration buckets (10 buckets: 0-10%, 10-20%, ...)
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${i * 10 + 10}%`,
      predictions: [] as { aiProbability: number; resolution: string }[],
    }));

    for (const r of allResolved) {
      const idx = Math.min(Math.floor(r.aiProbability / 10), 9);
      buckets[idx].predictions.push({
        aiProbability: r.aiProbability,
        resolution: r.resolution!,
      });
    }

    const calibration = buckets
      .filter((b) => b.predictions.length > 0)
      .map((b) => {
        const avgPredicted =
          b.predictions.reduce((s, p) => s + p.aiProbability, 0) /
          b.predictions.length;
        const avgActual =
          (b.predictions.filter((p) => p.resolution === "yes").length /
            b.predictions.length) *
          100;
        return {
          range: b.range,
          avgPredicted: Math.round(avgPredicted * 10) / 10,
          avgActual: Math.round(avgActual * 10) / 10,
          count: b.predictions.length,
        };
      });

    return NextResponse.json({
      totalPredictions,
      totalResolved,
      avgBrierScore:
        avgBrierScore !== null
          ? Math.round(avgBrierScore * 10000) / 10000
          : null,
      hitRate: hitRate !== null ? Math.round(hitRate * 10) / 10 : null,
      calibration,
      recentResolved: resolved.map((r) => ({
        id: r.id,
        marketTitle: r.marketTitle,
        aiProbability: r.aiProbability,
        marketProbability: r.marketProbability,
        resolution: r.resolution!,
        brierScore: r.brierScore,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() || "",
      })),
      pendingPredictions: pending.map((p) => ({
        id: p.id,
        marketId: p.marketId,
        marketTitle: p.marketTitle,
        aiProbability: p.aiProbability,
        marketProbability: p.marketProbability,
        divergence: p.divergence,
        confidence: p.confidence,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("AI Track GET error:", e);
    return NextResponse.json(
      {
        totalPredictions: 0,
        totalResolved: 0,
        avgBrierScore: null,
        hitRate: null,
        calibration: [],
        recentResolved: [],
        pendingPredictions: [],
      },
      { status: 200 }
    );
  }
}

// POST — Resolution checking
export async function POST() {
  const now = Date.now();
  if (now - lastResolutionCheck < RESOLUTION_INTERVAL) {
    return NextResponse.json({ graded: 0, throttled: true });
  }
  lastResolutionCheck = now;

  try {
    // Get unresolved predictions, oldest first, limit 20
    const unresolved = await prisma.aiPrediction.findMany({
      where: { resolution: null },
      orderBy: { createdAt: "asc" },
      take: 20,
      distinct: ["marketId"],
    });

    if (unresolved.length === 0) {
      return NextResponse.json({ graded: 0 });
    }

    let graded = 0;

    for (const prediction of unresolved) {
      const { marketId, source } = prediction;
      // Extract raw ID from prefixed marketId (e.g., "poly-slug" -> "slug")
      const rawId = marketId.replace(/^(poly|kal|man|pit)-/, "");

      try {
        let resolution: string | null = null;

        if (source === "polymarket") {
          const res = await fetch(
            `https://gamma-api.polymarket.com/markets/${rawId}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.resolved) {
              resolution = data.outcome === "Yes" ? "yes" : "no";
            }
          }
        } else if (source === "kalshi") {
          const res = await fetch(
            `https://api.elections.kalshi.com/trade-api/v2/markets/${rawId}`
          );
          if (res.ok) {
            const data = await res.json();
            const market = data.market || data;
            if (market.result) {
              resolution = market.result === "yes" ? "yes" : "no";
            }
          }
        } else if (source === "manifold") {
          const res = await fetch(
            `https://api.manifold.markets/v0/market/${rawId}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.resolution) {
              resolution =
                data.resolution === "YES"
                  ? "yes"
                  : data.resolution === "NO"
                    ? "no"
                    : null;
            }
          }
        }
        // PredictIt doesn't have an individual market resolution endpoint

        if (resolution) {
          const outcome = resolution === "yes" ? 1 : 0;
          const predicted = prediction.aiProbability / 100;
          const brierScore =
            Math.round((predicted - outcome) ** 2 * 10000) / 10000;

          // Update all predictions for this market (not just one)
          await prisma.aiPrediction.updateMany({
            where: { marketId, resolution: null },
            data: {
              resolution,
              resolvedAt: new Date(),
              brierScore,
            },
          });
          graded++;
        }
      } catch (e) {
        console.error(`Failed to check resolution for ${marketId}:`, e);
      }
    }

    return NextResponse.json({ graded });
  } catch (e) {
    console.error("AI Track POST error:", e);
    return NextResponse.json({ graded: 0, error: "Internal error" }, { status: 200 });
  }
}
