// Deterministic hash from string
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Seeded pseudo-random number generator
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function generateSparklinePoints(
  marketId: string,
  probability: number,
  change24h: number,
): number[] {
  const seed = hashCode(marketId);
  const rand = seededRandom(seed);
  const points: number[] = [];
  const numPoints = 7;

  // Work backwards from current probability
  // The first point should be roughly (probability - change24h)
  const startProb = probability - change24h;

  for (let i = 0; i < numPoints; i++) {
    const progress = i / (numPoints - 1); // 0 to 1
    // Linear interpolation from start to current + some noise
    const base = startProb + (probability - startProb) * progress;
    const noise = (rand() - 0.5) * 3; // small noise
    points.push(Math.max(1, Math.min(99, base + noise)));
  }

  // Ensure last point matches current probability
  points[numPoints - 1] = probability;

  return points;
}
