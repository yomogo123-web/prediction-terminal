import { Market, ArbPair } from "./types";

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "or", "and", "but", "if", "while", "that", "this", "it",
  "not", "no", "yes", "what", "which", "who", "whom", "how", "when",
  "where", "why", "all", "each", "every", "both", "few", "more",
  "most", "other", "some", "such", "than", "too", "very",
]);

function normalizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .sort();
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setB = new Set(b);
  let intersection = 0;
  for (let i = 0; i < a.length; i++) {
    if (setB.has(a[i])) intersection++;
  }
  const union = new Set(a.concat(b)).size;
  return union === 0 ? 0 : intersection / union;
}

function dateProximity(a: string, b: string): boolean {
  if (!a || !b) return true; // If no dates, assume they could match
  try {
    const da = new Date(a).getTime();
    const db = new Date(b).getTime();
    const diff = Math.abs(da - db);
    return diff < 90 * 24 * 60 * 60 * 1000; // 90 days
  } catch {
    return true;
  }
}

export function findArbPairs(markets: Market[]): ArbPair[] {
  const active = markets.filter((m) => m.status === "active");

  // Group by category for efficiency
  const byCategory = new Map<string, Market[]>();
  for (let k = 0; k < active.length; k++) {
    const m = active[k];
    const cat = m.category;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(m);
  }

  const pairs: ArbPair[] = [];
  const tokenCache = new Map<string, string[]>();

  function getTokens(m: Market): string[] {
    if (!tokenCache.has(m.id)) {
      tokenCache.set(m.id, normalizeTitle(m.title));
    }
    return tokenCache.get(m.id)!;
  }

  byCategory.forEach((catMarkets) => {
    for (let i = 0; i < catMarkets.length; i++) {
      for (let j = i + 1; j < catMarkets.length; j++) {
        const a = catMarkets[i];
        const b = catMarkets[j];

        // Must be cross-source
        if (a.source === b.source) continue;

        // Check date proximity
        if (!dateProximity(a.endDate, b.endDate)) continue;

        // Check title similarity
        const tokensA = getTokens(a);
        const tokensB = getTokens(b);
        const similarity = jaccardSimilarity(tokensA, tokensB);

        if (similarity < 0.4) continue;

        // Check price divergence > 2 cents
        const spread = Math.abs(a.probability - b.probability);
        if (spread < 2) continue;

        pairs.push({
          marketA: a.probability > b.probability ? a : b,
          marketB: a.probability > b.probability ? b : a,
          spread,
          similarity,
        });
      }
    }
  });

  // Sort by spread descending, take top 20
  pairs.sort((a, b) => b.spread - a.spread);
  return pairs.slice(0, 20);
}
