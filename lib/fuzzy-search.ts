import { Market } from "./types";

interface SearchResult {
  market: Market;
  score: number;
}

export function fuzzySearch(markets: Market[], query: string): SearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);
  const results: SearchResult[] = [];

  for (const market of markets) {
    const title = market.title.toLowerCase();
    let score = 0;

    // Exact prefix match (highest priority)
    if (title.startsWith(q)) {
      score += 100;
    }

    // Word-start match: query matches the start of any word in the title
    const titleWords = title.split(/\s+/);
    for (const tw of titleWords) {
      if (tw.startsWith(q)) {
        score += 50;
        break;
      }
    }

    // Contains match
    if (title.includes(q)) {
      score += 25;
    }

    // Individual word matching
    for (const word of words) {
      if (word.length < 2) continue;
      if (title.includes(word)) {
        score += 10;
      }
      // Category match bonus
      if (market.category.toLowerCase().includes(word)) {
        score += 5;
      }
      // Source match bonus
      if (market.source.includes(word)) {
        score += 3;
      }
    }

    if (score > 0) {
      results.push({ market, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 8);
}
