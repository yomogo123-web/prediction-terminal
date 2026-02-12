import { Market } from "./types";

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
  "says", "said", "new", "just", "also", "now", "get", "like",
]);

function normalizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
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

export interface NewsMatchResult {
  marketId: string;
  similarity: number;
}

export function matchNewsToMarkets(
  headline: string,
  markets: Market[],
  maxResults: number = 3
): NewsMatchResult[] {
  const headlineTokens = normalizeTitle(headline);
  if (headlineTokens.length === 0) return [];

  const scored: NewsMatchResult[] = [];

  for (const m of markets) {
    const marketTokens = normalizeTitle(m.title);
    const sim = jaccardSimilarity(headlineTokens, marketTokens);
    if (sim > 0.05) {
      scored.push({ marketId: m.id, similarity: sim });
    }
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, maxResults);
}
