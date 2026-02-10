import { create } from "zustand";
import { Market, Category, SortField, SortDirection, RightPanelTab, MarketAnalytics, SentimentData, VolatilityData, VWAPData, ConcentrationData, MispricingSignal, MomentumData } from "./types";
import { generateMockMarkets } from "./mock-data";
import { fetchMarkets, fetchPriceHistory } from "./api";
import { useMemo } from "react";

interface TerminalStore {
  markets: Market[];
  selectedMarketId: string | null;
  watchlist: string[];
  searchQuery: string;
  categoryFilter: Category | null;
  sortField: SortField;
  sortDirection: SortDirection;
  loading: boolean;
  dataSource: "live" | "mock";
  rightPanelTab: RightPanelTab;

  initMarkets: () => Promise<void>;
  refreshMarkets: () => Promise<void>;
  selectMarket: (id: string) => void;
  toggleWatchlist: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: Category | null) => void;
  setSort: (field: SortField) => void;
  simulatePriceUpdate: () => void;
  loadMarketHistory: (marketId: string) => Promise<void>;
  setRightPanelTab: (tab: RightPanelTab) => void;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  markets: [],
  selectedMarketId: null,
  watchlist: [],
  searchQuery: "",
  categoryFilter: null,
  sortField: "volume",
  sortDirection: "desc",
  loading: true,
  dataSource: "mock",
  rightPanelTab: "watchlist",

  initMarkets: async () => {
    set({ loading: true });
    try {
      const markets = await fetchMarkets();
      if (markets.length > 0) {
        set({
          markets,
          selectedMarketId: markets[0]?.id || null,
          loading: false,
          dataSource: "live",
        });
        return;
      }
    } catch (e) {
      console.warn("Failed to fetch live data, falling back to mock:", e);
    }
    // Fallback to mock data
    const markets = generateMockMarkets();
    set({
      markets,
      selectedMarketId: markets[0]?.id || null,
      loading: false,
      dataSource: "mock",
    });
  },

  refreshMarkets: async () => {
    try {
      const freshMarkets = await fetchMarkets();
      if (freshMarkets.length === 0) return;

      set((state) => {
        // Merge: update existing markets, add new ones, preserve local state
        const existingById = new Map(state.markets.map((m) => [m.id, m]));
        const merged = freshMarkets.map((fresh) => {
          const existing = existingById.get(fresh.id);
          if (existing) {
            return {
              ...fresh,
              previousProbability: existing.probability,
              // Preserve loaded price history
              priceHistory:
                existing.priceHistory.length > 0
                  ? existing.priceHistory
                  : fresh.priceHistory,
            };
          }
          return fresh;
        });

        // Keep selected market if still exists
        const selectedStillExists = merged.some(
          (m) => m.id === state.selectedMarketId
        );

        return {
          markets: merged,
          dataSource: "live" as const,
          selectedMarketId: selectedStillExists
            ? state.selectedMarketId
            : merged[0]?.id || null,
        };
      });
    } catch (e) {
      console.warn("Failed to refresh markets:", e);
    }
  },

  selectMarket: (id: string) => {
    set({ selectedMarketId: id });
  },

  toggleWatchlist: (id: string) => {
    const { watchlist } = get();
    if (watchlist.includes(id)) {
      set({ watchlist: watchlist.filter((wid) => wid !== id) });
    } else {
      set({ watchlist: [...watchlist, id] });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setCategoryFilter: (category: Category | null) => {
    set({ categoryFilter: category });
  },

  setSort: (field: SortField) => {
    const { sortField, sortDirection } = get();
    if (sortField === field) {
      set({ sortDirection: sortDirection === "asc" ? "desc" : "asc" });
    } else {
      set({ sortField: field, sortDirection: "desc" });
    }
  },

  simulatePriceUpdate: () => {
    set((state) => ({
      markets: state.markets.map((market) => {
        if (market.status !== "active") return market;

        // Gentle drift between real refreshes
        const magnitude = state.dataSource === "live" ? 0.1 : 1.0;
        const drift = (Math.random() - 0.5) * magnitude;
        const newProb = Math.max(1, Math.min(99, market.probability + drift));
        const rounded = Math.round(newProb * 100) / 100;

        return {
          ...market,
          previousProbability: market.probability,
          probability: rounded,
        };
      }),
    }));
  },

  loadMarketHistory: async (marketId: string) => {
    const { markets } = get();
    const market = markets.find((m) => m.id === marketId);
    if (!market || !market.clobTokenId) return;
    // Skip if already loaded
    if (market.priceHistory.length > 10) return;

    try {
      const history = await fetchPriceHistory(market.clobTokenId);
      set((state) => ({
        markets: state.markets.map((m) =>
          m.id === marketId ? { ...m, priceHistory: history } : m
        ),
      }));
    } catch (e) {
      console.warn("Failed to load price history:", e);
    }
  },

  setRightPanelTab: (tab: RightPanelTab) => {
    set({ rightPanelTab: tab });
  },
}));

// Derived data hooks

export function useFilteredMarkets(): Market[] {
  const markets = useTerminalStore((s) => s.markets);
  const searchQuery = useTerminalStore((s) => s.searchQuery);
  const categoryFilter = useTerminalStore((s) => s.categoryFilter);
  const sortField = useTerminalStore((s) => s.sortField);
  const sortDirection = useTerminalStore((s) => s.sortDirection);

  return useMemo(() => {
    let filtered = [...markets];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter((m) => m.category === categoryFilter);
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "probability":
          cmp = a.probability - b.probability;
          break;
        case "volume":
          cmp = a.volume - b.volume;
          break;
        case "change24h":
          cmp = a.change24h - b.change24h;
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [markets, searchQuery, categoryFilter, sortField, sortDirection]);
}

export function useSelectedMarket(): Market | null {
  const markets = useTerminalStore((s) => s.markets);
  const selectedMarketId = useTerminalStore((s) => s.selectedMarketId);

  return useMemo(() => {
    return markets.find((m) => m.id === selectedMarketId) || null;
  }, [markets, selectedMarketId]);
}

export function useWatchlistMarkets(): Market[] {
  const markets = useTerminalStore((s) => s.markets);
  const watchlist = useTerminalStore((s) => s.watchlist);

  return useMemo(() => {
    return markets.filter((m) => watchlist.includes(m.id));
  }, [markets, watchlist]);
}

export function useTopMovers(): { gainers: Market[]; losers: Market[] } {
  const markets = useTerminalStore((s) => s.markets);

  return useMemo(() => {
    const active = markets.filter((m) => m.status === "active");
    const sorted = [...active].sort((a, b) => b.change24h - a.change24h);
    return {
      gainers: sorted.slice(0, 5),
      losers: sorted.slice(-5).reverse(),
    };
  }, [markets]);
}

const ALL_CATEGORIES: Category[] = ["Politics", "Sports", "Crypto", "Tech", "World Events"];

export function useMarketAnalytics(): MarketAnalytics {
  const markets = useTerminalStore((s) => s.markets);

  return useMemo(() => {
    const active = markets.filter((m) => m.status === "active");
    const marketCount = active.length;

    // Meta stats
    let totalVolume = 0;
    let probSum = 0;
    const sourceSet = new Set<string>();
    const catMap = new Map<Category, { volume: number; count: number; changeSum: number; changes: number[] }>();
    const srcMap = new Map<Market["source"], { volume: number; count: number; probWeightedVol: number }>();

    // Sentiment accumulators
    let bullWeightedVol = 0;
    let bearWeightedVol = 0;
    let bullCount = 0;
    let bearCount = 0;
    let neutralCount = 0;

    // VWAP accumulators
    let vwapNumerator = 0; // sum(prob * volume)
    let vwapDenominator = 0; // sum(volume)
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      label: `${i * 10}-${i * 10 + 10}`,
      min: i * 10,
      max: i * 10 + 10,
      count: 0,
    }));

    for (const m of active) {
      totalVolume += m.volume;
      probSum += m.probability;
      if (m.source !== "mock") sourceSet.add(m.source);

      // Category stats
      const cat = catMap.get(m.category) || { volume: 0, count: 0, changeSum: 0, changes: [] };
      cat.volume += m.volume;
      cat.count += 1;
      cat.changeSum += m.change24h;
      cat.changes.push(m.change24h);
      catMap.set(m.category, cat);

      // Source stats
      const src = srcMap.get(m.source) || { volume: 0, count: 0, probWeightedVol: 0 };
      src.volume += m.volume;
      src.count += 1;
      src.probWeightedVol += m.probability * m.volume;
      srcMap.set(m.source, src);

      // Sentiment
      if (m.probability > 50) {
        bullCount++;
        bullWeightedVol += m.volume;
      } else if (m.probability < 50) {
        bearCount++;
        bearWeightedVol += m.volume;
      } else {
        neutralCount++;
      }

      // VWAP
      vwapNumerator += m.probability * m.volume;
      vwapDenominator += m.volume;

      // Probability distribution
      const bucketIdx = Math.min(Math.floor(m.probability / 10), 9);
      buckets[bucketIdx].count += 1;
    }

    const volumeByCategory = ALL_CATEGORIES.map((category) => {
      const stat = catMap.get(category);
      return {
        category,
        volume: stat?.volume || 0,
        count: stat?.count || 0,
        avgChange: stat && stat.count > 0 ? stat.changeSum / stat.count : 0,
      };
    }).sort((a, b) => b.volume - a.volume);

    const volumeBySource = Array.from(srcMap.entries())
      .map(([source, stat]) => ({ source, volume: stat.volume, count: stat.count }))
      .sort((a, b) => b.volume - a.volume);

    // Hot markets: abs(change24h) * log(volume + 1)
    const hotMarkets = [...active]
      .map((market) => ({
        market,
        score: Math.abs(market.change24h) * Math.log(market.volume + 1),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // --- NEW: Sentiment ---
    const totalSentimentVol = bullWeightedVol + bearWeightedVol || 1;
    const sentiment: SentimentData = {
      bullRatio: bullWeightedVol / totalSentimentVol * 100,
      bearRatio: bearWeightedVol / totalSentimentVol * 100,
      bullCount,
      bearCount,
      neutralCount,
    };

    // --- NEW: Volatility by Category ---
    const volatilityByCategory: VolatilityData[] = ALL_CATEGORIES.map((category) => {
      const stat = catMap.get(category);
      if (!stat || stat.count === 0) return { category, stdDev: 0, maxAbsMove: 0, count: 0 };
      const mean = stat.changeSum / stat.count;
      const variance = stat.changes.reduce((sum, c) => sum + (c - mean) ** 2, 0) / stat.count;
      const maxAbsMove = Math.max(...stat.changes.map(Math.abs));
      return { category, stdDev: Math.sqrt(variance), maxAbsMove, count: stat.count };
    }).sort((a, b) => b.stdDev - a.stdDev);

    // --- NEW: VWAP ---
    const overallVwap = vwapDenominator > 0 ? vwapNumerator / vwapDenominator : 0;
    const overallAvg = marketCount > 0 ? probSum / marketCount : 0;
    const vwap: VWAPData = {
      overall: {
        vwap: overallVwap,
        avg: overallAvg,
        skew: overallVwap - overallAvg,
      },
      bySource: Array.from(srcMap.entries()).map(([source, stat]) => ({
        source,
        vwap: stat.volume > 0 ? stat.probWeightedVol / stat.volume : 0,
        avg: stat.count > 0 ? stat.probWeightedVol / stat.volume : 0,
        count: stat.count,
      })).sort((a, b) => b.count - a.count),
    };

    // --- NEW: Volume Concentration (HHI) ---
    const sortedByVol = [...active].sort((a, b) => b.volume - a.volume);
    const totalVol = totalVolume || 1;
    const hhi = active.reduce((sum, m) => {
      const share = m.volume / totalVol;
      return sum + share * share;
    }, 0) * 10000; // HHI scale 0-10000
    const top5 = sortedByVol.slice(0, 5);
    const top5Vol = top5.reduce((s, m) => s + m.volume, 0);
    const concentrationLabel = hhi < 1500 ? "LOW" as const
      : hhi < 2500 ? "MODERATE" as const
      : hhi < 5000 ? "HIGH" as const
      : "VERY HIGH" as const;
    const concentration: ConcentrationData = {
      hhi,
      top5SharePct: (top5Vol / totalVol) * 100,
      top5Markets: top5.map((m) => ({
        title: m.title,
        sharePct: (m.volume / totalVol) * 100,
      })),
      label: concentrationLabel,
    };

    // --- NEW: Mispricing Signals ---
    const mispricingSignals: MispricingSignal[] = [];
    const medianVolume = marketCount > 0
      ? [...active].sort((a, b) => a.volume - b.volume)[Math.floor(marketCount / 2)].volume
      : 0;

    for (const m of active) {
      // Overconfidence: near extremes with high volume
      if ((m.probability < 15 || m.probability > 85) && m.volume > medianVolume * 1.5) {
        const extremeness = m.probability < 50 ? (15 - m.probability) : (m.probability - 85);
        const volRatio = m.volume / (medianVolume || 1);
        mispricingSignals.push({
          market: m,
          type: "overconfidence",
          score: Math.max(0, extremeness) * volRatio,
        });
      }
      // Opportunity: near 50/50 with low volume
      if (m.probability >= 35 && m.probability <= 65 && m.volume < medianVolume * 0.5) {
        const closeness = 1 - Math.abs(m.probability - 50) / 15;
        const volDiscount = 1 - (m.volume / (medianVolume || 1));
        mispricingSignals.push({
          market: m,
          type: "opportunity",
          score: closeness * Math.max(0, volDiscount) * 10,
        });
      }
    }
    mispricingSignals.sort((a, b) => b.score - a.score);

    // --- NEW: Category Momentum ---
    const categoryMomentum: MomentumData[] = ALL_CATEGORIES.map((category) => {
      const stat = catMap.get(category);
      if (!stat || stat.count === 0) return { category, upPct: 0, downPct: 0, netMomentum: 0, upCount: 0, downCount: 0 };
      const upCount = stat.changes.filter((c) => c > 0).length;
      const downCount = stat.changes.filter((c) => c < 0).length;
      // Volume-weighted net momentum for this category
      const catMarkets = active.filter((m) => m.category === category);
      const catTotalVol = catMarkets.reduce((s, m) => s + m.volume, 0) || 1;
      const netMomentum = catMarkets.reduce((s, m) => s + m.change24h * (m.volume / catTotalVol), 0);
      return {
        category,
        upPct: (upCount / stat.count) * 100,
        downPct: (downCount / stat.count) * 100,
        netMomentum,
        upCount,
        downCount,
      };
    }).sort((a, b) => Math.abs(b.netMomentum) - Math.abs(a.netMomentum));

    return {
      totalVolume,
      marketCount,
      avgProbability: marketCount > 0 ? probSum / marketCount : 0,
      activeSources: sourceSet.size,
      volumeByCategory,
      volumeBySource,
      probabilityDistribution: buckets,
      hotMarkets,
      sentiment,
      volatilityByCategory,
      vwap,
      concentration,
      mispricingSignals,
      categoryMomentum,
    };
  }, [markets]);
}
