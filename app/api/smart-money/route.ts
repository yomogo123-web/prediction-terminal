import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SmartMoneySignal, SmartMoneyPosition } from "@/lib/types";

// ─── Caches ────────────────────────────────────────────────────────

interface LeaderboardEntry {
  proxyWallet: string;
  userName: string;
  rank: number;
  pnl: number;
  volume: number;
  xUsername?: string;
}

interface PositionEntry {
  conditionId: string;
  outcomeIndex: number;
  size: number;
  avgPrice: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  title: string;
}

let leaderboardCache: LeaderboardEntry[] = [];
let leaderboardCacheAt = 0;
const LEADERBOARD_TTL = 60 * 60 * 1000; // 1 hour

let positionsCache: Map<string, PositionEntry[]> = new Map();
let positionsCacheAt = 0;
const POSITIONS_TTL = 10 * 60 * 1000; // 10 minutes

let fetchInProgress = false;

// ─── Helpers ───────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const now = Date.now();
  if (leaderboardCache.length > 0 && now - leaderboardCacheAt < LEADERBOARD_TTL) {
    return leaderboardCache;
  }

  try {
    const res = await fetch(
      "https://data-api.polymarket.com/leaderboard?timePeriod=ALL&orderBy=PNL&limit=25",
      { cache: "no-store" }
    );
    if (!res.ok) {
      console.error(`[SmartMoney] Leaderboard fetch failed: ${res.status}`);
      return leaderboardCache; // return stale cache
    }
    const data = await res.json();
    const entries: LeaderboardEntry[] = (data || []).map(
      (entry: Record<string, unknown>, i: number) => ({
        proxyWallet: (entry.proxyWallet || entry.address || "") as string,
        userName: (entry.username || entry.name || `Trader${i + 1}`) as string,
        rank: i + 1,
        pnl: Number(entry.pnl || entry.profit || 0),
        volume: Number(entry.volume || 0),
        xUsername: (entry.twitterUsername || entry.xUsername || undefined) as string | undefined,
      })
    );

    leaderboardCache = entries.filter((e) => e.proxyWallet);
    leaderboardCacheAt = now;
    return leaderboardCache;
  } catch (err) {
    console.error("[SmartMoney] Leaderboard fetch error:", err);
    return leaderboardCache;
  }
}

async function fetchWalletPositions(wallet: string): Promise<PositionEntry[]> {
  try {
    const res = await fetch(
      `https://data-api.polymarket.com/positions?user=${wallet}&sortBy=TOKENS&limit=100`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((pos: Record<string, unknown>) => ({
      conditionId: (pos.conditionId || pos.asset || "") as string,
      outcomeIndex: Number(pos.outcomeIndex ?? pos.outcome ?? 0),
      size: Number(pos.size || pos.tokens || 0),
      avgPrice: Number(pos.avgPrice || pos.averagePrice || 0),
      currentValue: Number(pos.currentValue || pos.value || 0),
      cashPnl: Number(pos.cashPnl || pos.pnl || 0),
      percentPnl: Number(pos.percentPnl || pos.percentChange || 0),
      title: (pos.title || pos.marketTitle || "") as string,
    }));
  } catch {
    return [];
  }
}

async function fetchAllPositions(wallets: LeaderboardEntry[]): Promise<Map<string, PositionEntry[]>> {
  const now = Date.now();
  if (positionsCache.size > 0 && now - positionsCacheAt < POSITIONS_TTL) {
    return positionsCache;
  }

  const map = new Map<string, PositionEntry[]>();
  for (const wallet of wallets) {
    const positions = await fetchWalletPositions(wallet.proxyWallet);
    if (positions.length > 0) {
      map.set(wallet.proxyWallet, positions);
    }
    await delay(200); // 5 req/sec throttle
  }

  positionsCache = map;
  positionsCacheAt = now;
  return map;
}

function computeSignals(
  leaderboard: LeaderboardEntry[],
  allPositions: Map<string, PositionEntry[]>,
  conditionMap: Record<string, { marketId: string; title: string }>
): SmartMoneySignal[] {
  // Group positions by conditionId
  const byCondition = new Map<string, SmartMoneyPosition[]>();

  for (const trader of leaderboard) {
    const positions = allPositions.get(trader.proxyWallet) || [];
    for (const pos of positions) {
      if (!conditionMap[pos.conditionId]) continue;

      const smPos: SmartMoneyPosition = {
        traderWallet: trader.proxyWallet,
        traderName: trader.userName,
        traderRank: trader.rank,
        traderPnl: trader.pnl,
        conditionId: pos.conditionId,
        outcomeIndex: pos.outcomeIndex,
        size: pos.size,
        averagePrice: pos.avgPrice,
        currentValue: pos.currentValue,
        cashPnl: pos.cashPnl,
        percentPnl: pos.percentPnl,
      };

      const existing = byCondition.get(pos.conditionId) || [];
      existing.push(smPos);
      byCondition.set(pos.conditionId, existing);
    }
  }

  const signals: SmartMoneySignal[] = [];

  byCondition.forEach((positions, conditionId) => {
    const info = conditionMap[conditionId];
    if (!info) return;

    const yesPositions = positions.filter((p) => p.outcomeIndex === 0);
    const noPositions = positions.filter((p) => p.outcomeIndex === 1);

    const totalYesSize = yesPositions.reduce((s, p) => s + p.size, 0);
    const totalNoSize = noPositions.reduce((s, p) => s + p.size, 0);
    const yesTraderCount = yesPositions.length;
    const noTraderCount = noPositions.length;

    let netDirection: "YES" | "NO" | "MIXED";
    if (yesTraderCount > 0 && noTraderCount === 0) netDirection = "YES";
    else if (noTraderCount > 0 && yesTraderCount === 0) netDirection = "NO";
    else netDirection = "MIXED";

    const totalTraders = yesTraderCount + noTraderCount;
    let strength: "STRONG" | "MODERATE" | "WEAK";
    if (totalTraders >= 4) strength = "STRONG";
    else if (totalTraders >= 2) strength = "MODERATE";
    else strength = "WEAK";

    signals.push({
      marketId: info.marketId,
      conditionId,
      positions: positions.sort((a, b) => b.currentValue - a.currentValue),
      totalYesSize,
      totalNoSize,
      yesTraderCount,
      noTraderCount,
      netDirection,
      strength,
    });
  });

  return signals;
}

// Fire-and-forget: persist to DB
function persistData(leaderboard: LeaderboardEntry[], signals: SmartMoneySignal[]) {
  // Upsert wallets
  Promise.all(
    leaderboard.map((w) =>
      prisma.smartMoneyWallet.upsert({
        where: { proxyWallet: w.proxyWallet },
        update: { userName: w.userName, rank: w.rank, pnl: w.pnl, volume: w.volume, xUsername: w.xUsername },
        create: { proxyWallet: w.proxyWallet, userName: w.userName, rank: w.rank, pnl: w.pnl, volume: w.volume, xUsername: w.xUsername },
      })
    )
  ).catch((err) => console.error("[SmartMoney] Wallet persist error:", err));

  // Persist snapshots
  const snapshots = signals.flatMap((signal) =>
    signal.positions.map((pos) => ({
      proxyWallet: pos.traderWallet,
      conditionId: pos.conditionId,
      marketTitle: "",
      outcomeIndex: pos.outcomeIndex,
      size: pos.size,
      averagePrice: pos.averagePrice,
      currentValue: pos.currentValue,
      cashPnl: pos.cashPnl,
      percentPnl: pos.percentPnl,
    }))
  );

  if (snapshots.length > 0) {
    prisma.smartMoneySnapshot
      .createMany({ data: snapshots })
      .catch((err) => console.error("[SmartMoney] Snapshot persist error:", err));
  }
}

// ─── POST: Fetch leaderboard + positions, compute signals ──────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const conditionMap: Record<string, { marketId: string; title: string }> =
      body.conditionMap || {};

    if (Object.keys(conditionMap).length === 0) {
      return NextResponse.json([]);
    }

    if (fetchInProgress) {
      // Return empty while another fetch is running — client will retry in 10min
      return NextResponse.json([]);
    }

    fetchInProgress = true;
    try {
      const leaderboard = await fetchLeaderboard();
      if (leaderboard.length === 0) {
        return NextResponse.json([]);
      }

      const allPositions = await fetchAllPositions(leaderboard);
      const signals = computeSignals(leaderboard, allPositions, conditionMap);

      // Fire-and-forget persist
      persistData(leaderboard, signals);

      return NextResponse.json(signals);
    } finally {
      fetchInProgress = false;
    }
  } catch (err) {
    console.error("[SmartMoney] POST error:", err);
    return NextResponse.json([]);
  }
}

// ─── GET: Historical snapshots for a single market ─────────────────

export async function GET(request: NextRequest) {
  const conditionId = request.nextUrl.searchParams.get("conditionId");
  if (!conditionId) {
    return NextResponse.json({ error: "conditionId required" }, { status: 400 });
  }

  try {
    const snapshots = await prisma.smartMoneySnapshot.findMany({
      where: { conditionId },
      orderBy: { snapshotAt: "desc" },
      take: 50,
    });
    return NextResponse.json(snapshots);
  } catch (err) {
    console.error("[SmartMoney] GET error:", err);
    return NextResponse.json([]);
  }
}
