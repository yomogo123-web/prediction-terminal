import { Market, EdgeSignal, Category } from "./types";
import { findArbPairs } from "./arbitrage";

function getEdgeLabel(score: number): EdgeSignal["edgeLabel"] {
  if (score >= 40) return "STRONG BUY";
  if (score >= 15) return "BUY";
  if (score <= -40) return "STRONG SELL";
  if (score <= -15) return "SELL";
  return "NEUTRAL";
}

export function computeEdgeSignals(markets: Market[]): Map<string, EdgeSignal> {
  const active = markets.filter((m) => m.status === "active");
  const result = new Map<string, EdgeSignal>();

  if (active.length === 0) return result;

  // Pre-compute arb pairs for cross-source divergence
  const arbPairs = findArbPairs(markets);
  const arbSpreadMap = new Map<string, number>();
  for (const pair of arbPairs) {
    // Both markets in a pair get the spread as divergence signal
    const existing = arbSpreadMap.get(pair.marketA.id) || 0;
    arbSpreadMap.set(pair.marketA.id, Math.max(existing, pair.spread));
    const existingB = arbSpreadMap.get(pair.marketB.id) || 0;
    arbSpreadMap.set(pair.marketB.id, Math.max(existingB, pair.spread));
  }

  // Pre-compute category medians for volume
  const catVolumes = new Map<Category, number[]>();
  const catMomentum = new Map<Category, number>();
  for (const m of active) {
    const vols = catVolumes.get(m.category) || [];
    vols.push(m.volume);
    catVolumes.set(m.category, vols);

    const mom = catMomentum.get(m.category) || 0;
    catMomentum.set(m.category, mom + m.change24h);
  }

  const catMedianVol = new Map<Category, number>();
  catVolumes.forEach((vols, cat) => {
    const sorted = [...vols].sort((a, b) => a - b);
    catMedianVol.set(cat, sorted[Math.floor(sorted.length / 2)]);
  });

  // Normalize category momentum to count
  const catCount = new Map<Category, number>();
  for (const m of active) {
    catCount.set(m.category, (catCount.get(m.category) || 0) + 1);
  }
  const catNetMomentum = new Map<Category, number>();
  catMomentum.forEach((sum, cat) => {
    catNetMomentum.set(cat, sum / (catCount.get(cat) || 1));
  });

  for (const m of active) {
    const medianVol = catMedianVol.get(m.category) || 1;
    const catMom = catNetMomentum.get(m.category) || 0;

    // 1. Cross-source divergence (40% weight)
    const arbSpread = arbSpreadMap.get(m.id);
    let crossSourceScore: number | null = null;
    if (arbSpread !== undefined) {
      // Spread of 5+ cents = strong signal, cap at 20
      crossSourceScore = Math.min(arbSpread * 5, 100);
    }

    // 2. Volume anomaly (25% weight)
    // Low volume + mid-probability = opportunity (positive)
    // High volume + extreme probability = overconfidence (negative)
    const volRatio = medianVol > 0 ? m.volume / medianVol : 1;
    const midness = 1 - Math.abs(m.probability - 50) / 50; // 0 at extremes, 1 at 50%
    let volumeAnomaly: number;
    if (volRatio < 0.5 && midness > 0.4) {
      // Low volume + mid prob = opportunity
      volumeAnomaly = (1 - volRatio) * midness * 100;
    } else if (volRatio > 2 && midness < 0.3) {
      // High volume + extreme prob = overconfidence signal
      volumeAnomaly = -Math.min(volRatio * (1 - midness) * 20, 100);
    } else {
      volumeAnomaly = 0;
    }

    // 3. Momentum divergence (20% weight)
    // Market going opposite to category net = contrarian signal
    let momentumDivergence = 0;
    if (Math.abs(catMom) > 0.5 && Math.abs(m.change24h) > 0.5) {
      if ((m.change24h > 0 && catMom < 0) || (m.change24h < 0 && catMom > 0)) {
        // Contrarian: positive signal
        momentumDivergence = Math.min(Math.abs(m.change24h - catMom) * 10, 100);
      } else {
        // Following herd: slight negative
        momentumDivergence = -Math.min(Math.abs(m.change24h) * 5, 30);
      }
    }

    // 4. Price extremeness (15% weight)
    let priceExtremeness = 0;
    if (m.probability < 10 || m.probability > 90) {
      if (volRatio > 1.5) {
        // Near extremes with high volume = overconfidence (negative = sell signal)
        priceExtremeness = -Math.min((1 - midness) * volRatio * 30, 100);
      } else {
        // Near extremes with low volume = could be mispriced
        priceExtremeness = Math.min((1 - midness) * 50, 50);
      }
    } else if (midness > 0.6 && volRatio < 0.5) {
      // Near 50% with very low volume = opportunity
      priceExtremeness = Math.min(midness * 60, 60);
    }

    // Composite score
    const crossWeight = crossSourceScore !== null ? 0.4 : 0;
    const remaining = 1 - crossWeight;
    const volWeight = 0.25 * (remaining / 0.6);
    const momWeight = 0.2 * (remaining / 0.6);
    const priceWeight = 0.15 * (remaining / 0.6);

    const compositeScore =
      (crossSourceScore !== null ? crossSourceScore * 0.4 : 0) +
      volumeAnomaly * volWeight +
      momentumDivergence * momWeight +
      priceExtremeness * priceWeight;

    const clampedScore = Math.max(-100, Math.min(100, Math.round(compositeScore)));

    // Confidence: higher when more signals fire
    const signalCount = [
      crossSourceScore !== null ? 1 : 0,
      Math.abs(volumeAnomaly) > 10 ? 1 : 0,
      Math.abs(momentumDivergence) > 5 ? 1 : 0,
      Math.abs(priceExtremeness) > 5 ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    const confidence = Math.min(signalCount / 4 + 0.1, 1);

    result.set(m.id, {
      marketId: m.id,
      edgeScore: clampedScore,
      edgeLabel: getEdgeLabel(clampedScore),
      components: {
        crossSourceDivergence: crossSourceScore,
        volumeAnomaly: Math.round(volumeAnomaly),
        momentumDivergence: Math.round(momentumDivergence),
        priceExtremeness: Math.round(priceExtremeness),
      },
      confidence,
    });
  }

  return result;
}
