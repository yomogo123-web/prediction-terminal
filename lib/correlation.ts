import { Market, Category, CorrelationMatrix } from "./types";
import { generateSparklinePoints } from "./sparkline";

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;

  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }

  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

  if (den === 0) return 0;
  return Math.max(-1, Math.min(1, num / den));
}

const ALL_CATEGORIES: Category[] = ["Politics", "Sports", "Crypto", "Tech", "World Events"];

export function computeCategoryCorrelation(markets: Market[]): CorrelationMatrix {
  const active = markets.filter((m) => m.status === "active");

  // Group change24h values by category
  const catChanges = new Map<Category, number[]>();
  for (let i = 0; i < ALL_CATEGORIES.length; i++) {
    catChanges.set(ALL_CATEGORIES[i], []);
  }
  for (let i = 0; i < active.length; i++) {
    catChanges.get(active[i].category)?.push(active[i].change24h);
  }

  // Pad arrays to same length (use 0 for missing)
  const maxLen = Math.max(...Array.from(catChanges.values()).map((v) => v.length), 1);
  ALL_CATEGORIES.forEach((cat) => {
    const vals = catChanges.get(cat)!;
    while (vals.length < maxLen) vals.push(0);
    catChanges.set(cat, vals);
  });

  const labels = ALL_CATEGORIES.map((c) => c.slice(0, 5).toUpperCase());
  const values: number[][] = [];

  for (let i = 0; i < ALL_CATEGORIES.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < ALL_CATEGORIES.length; j++) {
      if (i === j) {
        row.push(1);
      } else {
        row.push(pearson(
          catChanges.get(ALL_CATEGORIES[i])!,
          catChanges.get(ALL_CATEGORIES[j])!,
        ));
      }
    }
    values.push(row);
  }

  return { labels, values };
}

export function computeMarketCorrelation(markets: Market[]): CorrelationMatrix {
  const active = markets.filter((m) => m.status === "active");
  // Top 10 by volume
  const top10 = [...active].sort((a, b) => b.volume - a.volume).slice(0, 10);

  const sparklines = top10.map((m) =>
    generateSparklinePoints(m.id, m.probability, m.change24h)
  );

  const labels = top10.map((m) =>
    m.title.length > 8 ? m.title.slice(0, 8) : m.title
  );
  const values: number[][] = [];

  for (let i = 0; i < top10.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < top10.length; j++) {
      if (i === j) {
        row.push(1);
      } else {
        row.push(pearson(sparklines[i], sparklines[j]));
      }
    }
    values.push(row);
  }

  return { labels, values };
}
