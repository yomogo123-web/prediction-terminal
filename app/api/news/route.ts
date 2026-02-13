import { NextResponse } from "next/server";

interface RawNewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

const RSS_FEEDS = [
  { url: "https://news.google.com/rss/topics/CAAqBwgKMKHL9QowkqL0Ag?hl=en-US&gl=US&ceid=US:en", label: "Business" },
  { url: "https://news.google.com/rss/topics/CAAqBwgKMNiE8Aow4P70Ag?hl=en-US&gl=US&ceid=US:en", label: "Tech" },
  { url: "https://news.google.com/rss/topics/CAAqBwgKMIuv1gEw6a70Ag?hl=en-US&gl=US&ceid=US:en", label: "Sports" },
  { url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", label: "Top Stories" },
];

function parseRssItems(xml: string): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/);
    const linkMatch = block.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);
    const sourceMatch = block.match(/<source[^>]*>(.*?)<\/source>/) ||
                        block.match(/<source[^>]*><!\[CDATA\[(.*?)\]\]><\/source>/);

    const title = titleMatch?.[1] || titleMatch?.[2] || "";
    const url = linkMatch?.[1] || "";
    const publishedAt = pubDateMatch?.[1] || new Date().toISOString();
    const source = sourceMatch?.[1] || "Google News";

    if (title && !title.includes("Google News")) {
      items.push({ title, url, source, publishedAt });
    }
  }

  return items;
}

async function fetchAllNews(): Promise<RawNewsItem[]> {
  const allItems: RawNewsItem[] = [];

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(5000),
          next: { revalidate: 300 }, // 5-minute edge cache
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssItems(xml);
      } catch {
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  // Deduplicate by title
  const seen = new Set<string>();
  const deduped = allItems.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date (most recent first)
  deduped.sort((a, b) => {
    try {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    } catch {
      return 0;
    }
  });

  return deduped.slice(0, 50);
}

// Simple keyword-based matching for server-side correlation
// Returns actual market IDs instead of array indices
function matchHeadlineToMarkets(headline: string, marketEntries: { id: string; title: string }[]): string[] {
  const STOP = new Set(["the", "a", "an", "is", "are", "was", "were", "will", "to", "of", "in", "for", "on", "with", "at", "by", "from", "and", "or", "but", "not", "this", "that", "it", "as"]);
  const headlineWords = headline.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  if (headlineWords.length === 0) return [];

  const headlineSet = new Set(headlineWords);
  const scored: { id: string; score: number }[] = [];

  for (const entry of marketEntries) {
    const marketWords = entry.title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
    let overlap = 0;
    for (const w of marketWords) {
      if (headlineSet.has(w)) overlap++;
    }
    const union = new Set([...headlineWords, ...marketWords]).size;
    const sim = union > 0 ? overlap / union : 0;
    if (sim > 0.05) {
      scored.push({ id: entry.id, score: sim });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.id);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketsParam = searchParams.get("markets") || "";
  // Parse "id|title" pairs, falling back to title-only for backwards compat
  const marketEntries = marketsParam
    ? marketsParam.split(",").map((entry) => {
        const pipeIdx = entry.indexOf("|");
        if (pipeIdx > 0) {
          return { id: entry.slice(0, pipeIdx).trim(), title: entry.slice(pipeIdx + 1).trim() };
        }
        return { id: entry.trim(), title: entry.trim() };
      })
    : [];

  // RSS fetches are edge-cached via next.revalidate (5 min)
  const rawItems = await fetchAllNews();

  const items = rawItems.map((item, i) => {
    const matchedIds = matchHeadlineToMarkets(item.title, marketEntries);
    return {
      id: `news-${i}-${Date.now()}`,
      title: item.title,
      url: item.url,
      source: item.source,
      publishedAt: item.publishedAt,
      correlatedMarketIds: matchedIds,
      relevanceScore: matchedIds.length > 0 ? 1 : 0,
    };
  });

  return NextResponse.json(items.slice(0, 30));
}
