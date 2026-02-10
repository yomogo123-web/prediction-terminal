import { create } from "zustand";
import { Market, Category, SortField, SortDirection } from "./types";
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

  initMarkets: () => Promise<void>;
  refreshMarkets: () => Promise<void>;
  selectMarket: (id: string) => void;
  toggleWatchlist: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: Category | null) => void;
  setSort: (field: SortField) => void;
  simulatePriceUpdate: () => void;
  loadMarketHistory: (marketId: string) => Promise<void>;
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
