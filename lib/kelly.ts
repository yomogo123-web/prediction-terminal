export interface KellyResult {
  fullKelly: number;
  halfKelly: number;
  quarterKelly: number;
  ev: number;
  maxLoss: number;
  edge: number;
}

/**
 * Compute Kelly Criterion position sizes.
 * @param bankroll Total bankroll in USD
 * @param trueProb True probability estimate (0-100)
 * @param marketProb Current market probability (0-100)
 * @returns Kelly sizing recommendations
 */
export function computeKelly(
  bankroll: number,
  trueProb: number,
  marketProb: number
): KellyResult {
  const p = trueProb / 100; // true probability of winning
  const q = 1 - p;          // probability of losing
  const b = (100 / marketProb) - 1; // decimal odds - 1 (net odds)

  // Kelly fraction: f* = (bp - q) / b
  const kellyFraction = b > 0 ? (b * p - q) / b : 0;
  const clampedKelly = Math.max(0, Math.min(1, kellyFraction));

  const fullKelly = Math.round(bankroll * clampedKelly * 100) / 100;
  const halfKelly = Math.round(fullKelly * 0.5 * 100) / 100;
  const quarterKelly = Math.round(fullKelly * 0.25 * 100) / 100;

  // Expected value per dollar bet
  const ev = Math.round((p * b - q) * 100) / 100;

  // Max loss is the full bet amount (capped at bankroll)
  const maxLoss = fullKelly;

  // Edge = trueProb - marketProb
  const edge = Math.round((trueProb - marketProb) * 10) / 10;

  return { fullKelly, halfKelly, quarterKelly, ev, maxLoss, edge };
}
