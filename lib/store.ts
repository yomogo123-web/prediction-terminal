import { create } from "zustand";
import { Market, Category, SortField, SortDirection, RightPanelTab, Alert, ArbPair, CorrelationMatrix, MarketAnalytics, SentimentData, VolatilityData, VWAPData, ConcentrationData, MispricingSignal, MomentumData, EdgeSignal, NewsItem, AIEdgePrediction, AITrackStats, SmartMoneySignal } from "./types";
import { OrderBook, TradeEstimate, TradeRequest, TradeSide, OrderType, OrderRecord, PositionRecord, CredentialStatus } from "./trading-types";
import { generateMockMarkets } from "./mock-data";
import { fetchMarkets, fetchPriceHistory } from "./api";
import { findArbPairs } from "./arbitrage";
import { computeCategoryCorrelation, computeMarketCorrelation } from "./correlation";
import { hapticMedium } from "./capacitor";
import { computeEdgeSignals } from "./edge-detection";
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

  // Alerts
  alerts: Alert[];
  triggeredAlerts: Alert[];

  // News
  newsItems: NewsItem[];
  newsLoading: boolean;

  // AI Edge
  aiEdgePredictions: AIEdgePrediction[];
  aiEdgeLoading: boolean;

  // AI Track
  aiTrackStats: AITrackStats | null;
  aiTrackLoading: boolean;

  // Smart Money
  smartMoneySignals: SmartMoneySignal[];
  smartMoneyLoading: boolean;

  // Cached expensive computations
  cachedEdgeSignals: Map<string, EdgeSignal>;
  cachedArbPairs: ArbPair[];
  cachedCategoryCorrelation: CorrelationMatrix;
  cachedMarketCorrelation: CorrelationMatrix;

  // Price history loading state
  historyLoadingIds: Set<string>;
  historyFailedIds: Set<string>;

  // Data freshness
  lastRefreshedAt: number | null;

  // WebSocket
  wsConnected: boolean;

  // Mobile
  mobilePanel: "table" | "detail" | "chart" | "tabs";
  rightPanelOpen: boolean;

  initMarkets: () => Promise<void>;
  refreshMarkets: () => Promise<void>;
  selectMarket: (id: string) => void;
  toggleWatchlist: (id: string) => void;
  setWatchlist: (ids: string[]) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: Category | null) => void;
  setSort: (field: SortField) => void;
  simulatePriceUpdate: (skipPolymarket?: boolean) => void;
  setWsConnected: (connected: boolean) => void;
  updateMarketPrices: (updates: Map<string, number>) => void;
  loadMarketHistory: (marketId: string) => Promise<void>;
  setRightPanelTab: (tab: RightPanelTab) => void;

  // Alert actions
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  triggerAlerts: (ids: string[]) => void;
  dismissTriggeredAlert: (id: string) => void;

  // News actions
  fetchNews: () => Promise<void>;

  // AI Edge actions
  fetchAIEdge: () => Promise<void>;

  // AI Track actions
  fetchAITrack: () => Promise<void>;
  checkResolutions: () => Promise<void>;

  // Smart Money actions
  fetchSmartMoney: () => Promise<void>;

  // Expensive computation refresh (call on market data changes, not price drift)
  recomputeSignals: () => void;

  // Mobile actions
  setMobilePanel: (panel: "table" | "detail" | "chart" | "tabs") => void;
  setRightPanelOpen: (open: boolean) => void;

  // Trading state
  orderBook: OrderBook | null;
  orderBookLoading: boolean;
  tradeEstimate: TradeEstimate | null;
  orders: OrderRecord[];
  positions: PositionRecord[];
  credentialStatuses: CredentialStatus[];
  orderFormSide: TradeSide;
  orderFormType: OrderType;
  orderFormAmount: string;
  orderFormLimitPrice: string;
  tradeSubmitting: boolean;
  tradeConfirmPending: TradeRequest | null;
  showCredentialsModal: boolean;

  // Trading actions
  fetchOrderBook: (marketId: string, source: string, clobTokenId?: string) => Promise<void>;
  fetchTradeEstimate: (req: { marketId: string; side: TradeSide; type: OrderType; amount: number; limitPrice?: number; source: string; clobTokenId?: string }) => Promise<void>;
  submitOrder: (req: { marketId: string; side: TradeSide; type: OrderType; amount: number; limitPrice?: number; source: string }) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchPositions: () => Promise<void>;
  fetchCredentialStatuses: () => Promise<void>;
  setOrderFormSide: (side: TradeSide) => void;
  setOrderFormType: (type: OrderType) => void;
  setOrderFormAmount: (amount: string) => void;
  setOrderFormLimitPrice: (price: string) => void;
  setTradeConfirmPending: (req: TradeRequest | null) => void;
  setShowCredentialsModal: (show: boolean) => void;
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
  alerts: [],
  triggeredAlerts: [],
  newsItems: [],
  newsLoading: false,
  aiEdgePredictions: [],
  aiEdgeLoading: false,
  aiTrackStats: null,
  aiTrackLoading: false,
  smartMoneySignals: [],
  smartMoneyLoading: false,
  cachedEdgeSignals: new Map(),
  cachedArbPairs: [],
  cachedCategoryCorrelation: { labels: [], values: [] },
  cachedMarketCorrelation: { labels: [], values: [] },
  historyLoadingIds: new Set<string>(),
  historyFailedIds: new Set<string>(),
  lastRefreshedAt: null,
  wsConnected: false,
  mobilePanel: "table",
  rightPanelOpen: false,

  // Trading initial state
  orderBook: null,
  orderBookLoading: false,
  tradeEstimate: null,
  orders: [],
  positions: [],
  credentialStatuses: [],
  orderFormSide: "yes",
  orderFormType: "market",
  orderFormAmount: "",
  orderFormLimitPrice: "",
  tradeSubmitting: false,
  tradeConfirmPending: null,
  showCredentialsModal: false,

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
          lastRefreshedAt: Date.now(),
        });
        get().recomputeSignals();
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
    get().recomputeSignals();
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
              priceHistory:
                existing.priceHistory.length > 0
                  ? existing.priceHistory
                  : fresh.priceHistory,
            };
          }
          return fresh;
        });

        const selectedStillExists = merged.some(
          (m) => m.id === state.selectedMarketId
        );

        return {
          markets: merged,
          dataSource: "live" as const,
          lastRefreshedAt: Date.now(),
          selectedMarketId: selectedStillExists
            ? state.selectedMarketId
            : merged[0]?.id || null,
        };
      });
      get().recomputeSignals();
    } catch (e) {
      console.warn("Failed to refresh markets:", e);
    }
  },

  selectMarket: (id: string) => {
    set({ selectedMarketId: id });
  },

  toggleWatchlist: (id: string) => {
    hapticMedium();
    const { watchlist } = get();
    const isRemoving = watchlist.includes(id);
    const newWatchlist = isRemoving
      ? watchlist.filter((wid) => wid !== id)
      : [...watchlist, id];
    set({ watchlist: newWatchlist });

    // Always persist to localStorage for guest mode
    try { localStorage.setItem("guest_watchlist", JSON.stringify(newWatchlist)); } catch {}

    // Fire-and-forget sync to DB (will 401 for guests, that's OK)
    fetch("/api/watchlist", {
      method: isRemoving ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketId: id }),
    }).catch(() => {});
  },

  setWatchlist: (ids: string[]) => {
    set({ watchlist: ids });
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

  simulatePriceUpdate: (skipPolymarket?: boolean) => {
    set((state) => ({
      markets: state.markets.map((market) => {
        if (market.status !== "active") return market;
        if (skipPolymarket && market.source === "polymarket") return market;

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

  setWsConnected: (connected: boolean) => {
    set({ wsConnected: connected });
  },

  updateMarketPrices: (updates: Map<string, number>) => {
    set((state) => ({
      markets: state.markets.map((market) => {
        const newPrice = updates.get(market.id);
        if (newPrice === undefined) return market;

        // Skip tiny updates (< 0.01 probability point) to avoid noise
        if (Math.abs(newPrice - market.probability) < 0.01) return market;

        return {
          ...market,
          previousProbability: market.probability,
          probability: Math.round(newPrice * 100) / 100,
        };
      }),
    }));
  },

  loadMarketHistory: async (marketId: string) => {
    const { markets, historyLoadingIds } = get();
    const market = markets.find((m) => m.id === marketId);
    if (!market) return;
    if (market.priceHistory.length > 10) return;
    if (historyLoadingIds.has(marketId)) return;

    // Use clobTokenId if available, otherwise extract ID from market ID prefix
    const token = market.clobTokenId || marketId.replace(/^(poly|kal|man|pit)-/, "");
    if (!token) return;

    set((state) => ({
      historyLoadingIds: new Set(Array.from(state.historyLoadingIds).concat(marketId)),
      historyFailedIds: new Set(Array.from(state.historyFailedIds).filter((id) => id !== marketId)),
    }));

    try {
      const history = await fetchPriceHistory(token, market.source, market.probability);
      set((state) => ({
        markets: state.markets.map((m) =>
          m.id === marketId ? { ...m, priceHistory: history } : m
        ),
        historyLoadingIds: new Set(Array.from(state.historyLoadingIds).filter((id) => id !== marketId)),
      }));
    } catch (e) {
      console.warn("Failed to load price history:", e);
      set((state) => ({
        historyLoadingIds: new Set(Array.from(state.historyLoadingIds).filter((id) => id !== marketId)),
        historyFailedIds: new Set(Array.from(state.historyFailedIds).concat(marketId)),
      }));
    }
  },

  setRightPanelTab: (tab: RightPanelTab) => {
    set({ rightPanelTab: tab });
  },

  // Alert actions
  setAlerts: (alerts: Alert[]) => {
    set({ alerts });
  },

  addAlert: (alert: Alert) => {
    const newAlerts = [...get().alerts, alert];
    set({ alerts: newAlerts });

    // Always persist to localStorage for guest mode
    try { localStorage.setItem("guest_alerts", JSON.stringify(newAlerts)); } catch {}

    // Sync to DB
    fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alert),
    }).catch(() => {});
  },

  removeAlert: (id: string) => {
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) }));
    fetch("/api/alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  },

  toggleAlert: (id: string) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, active: !a.active } : a
      ),
    }));
  },

  triggerAlerts: (ids: string[]) => {
    set((state) => {
      const idSet = new Set(ids);
      const triggered = state.alerts.filter((a) => idSet.has(a.id));
      return {
        alerts: state.alerts.map((a) =>
          idSet.has(a.id) ? { ...a, active: false } : a
        ),
        triggeredAlerts: [...state.triggeredAlerts, ...triggered],
      };
    });
    // Sync deactivation to DB
    for (const id of ids) {
      fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: false }),
      }).catch(() => {});
    }
  },

  dismissTriggeredAlert: (id: string) => {
    set((state) => ({
      triggeredAlerts: state.triggeredAlerts.filter((a) => a.id !== id),
    }));
  },

  fetchNews: async () => {
    set({ newsLoading: true });
    try {
      const { markets } = get();
      const batch = markets.slice(0, 20).map((m) => `${m.id}|${m.title}`).join(",");
      const res = await fetch(`/api/news?markets=${encodeURIComponent(batch)}`);
      if (res.ok) {
        const items: NewsItem[] = await res.json();
        set({ newsItems: items, newsLoading: false });
      } else {
        set({ newsLoading: false });
      }
    } catch {
      set({ newsLoading: false });
    }
  },

  fetchAIEdge: async () => {
    set({ aiEdgeLoading: true });
    try {
      const { markets } = get();
      const batch = markets
        .filter((m) => m.status === "active")
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 20)
        .map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          category: m.category,
          probability: m.probability,
          volume: m.volume,
          change24h: m.change24h,
          source: m.source,
        }));
      if (batch.length === 0) {
        set({ aiEdgeLoading: false });
        return;
      }
      const res = await fetch("/api/ai-edge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markets: batch }),
      });
      if (res.ok) {
        const predictions: AIEdgePrediction[] = await res.json();
        set({ aiEdgePredictions: predictions, aiEdgeLoading: false });
      } else {
        set({ aiEdgeLoading: false });
      }
    } catch {
      set({ aiEdgeLoading: false });
    }
  },

  fetchAITrack: async () => {
    set({ aiTrackLoading: true });
    try {
      const res = await fetch("/api/ai-track");
      if (res.ok) {
        const stats: AITrackStats = await res.json();
        set({ aiTrackStats: stats, aiTrackLoading: false });
      } else {
        set({ aiTrackLoading: false });
      }
    } catch {
      set({ aiTrackLoading: false });
    }
  },

  checkResolutions: async () => {
    try {
      await fetch("/api/ai-track", { method: "POST" });
    } catch {
      // silent
    }
  },

  fetchSmartMoney: async () => {
    set({ smartMoneyLoading: true });
    try {
      const { markets } = get();
      // Build conditionMap from Polymarket markets that have conditionId
      const conditionMap: Record<string, { marketId: string; title: string }> = {};
      for (const m of markets) {
        if (m.source === "polymarket" && m.conditionId) {
          conditionMap[m.conditionId] = { marketId: m.id, title: m.title };
        }
      }
      if (Object.keys(conditionMap).length === 0) {
        set({ smartMoneyLoading: false });
        return;
      }
      const res = await fetch("/api/smart-money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conditionMap }),
      });
      if (res.ok) {
        const signals: SmartMoneySignal[] = await res.json();
        set({ smartMoneySignals: signals, smartMoneyLoading: false });
      } else {
        set({ smartMoneyLoading: false });
      }
    } catch {
      set({ smartMoneyLoading: false });
    }
  },

  setMobilePanel: (panel) => {
    set({ mobilePanel: panel });
  },

  setRightPanelOpen: (open) => {
    set({ rightPanelOpen: open });
  },

  recomputeSignals: () => {
    const { markets } = get();
    set({
      cachedEdgeSignals: computeEdgeSignals(markets),
      cachedArbPairs: findArbPairs(markets),
      cachedCategoryCorrelation: computeCategoryCorrelation(markets),
      cachedMarketCorrelation: computeMarketCorrelation(markets),
    });
  },

  // Trading actions
  fetchOrderBook: async (marketId, source, clobTokenId) => {
    set({ orderBookLoading: true });
    try {
      const params = new URLSearchParams({ marketId, source });
      if (clobTokenId) params.set("clobTokenId", clobTokenId);
      const res = await fetch(`/api/trade/orderbook?${params}`);
      if (res.ok) {
        const orderBook: OrderBook = await res.json();
        set({ orderBook, orderBookLoading: false });
      } else {
        set({ orderBookLoading: false });
      }
    } catch {
      set({ orderBookLoading: false });
    }
  },

  fetchTradeEstimate: async (req) => {
    try {
      const res = await fetch("/api/trade/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const estimate: TradeEstimate = await res.json();
        set({ tradeEstimate: estimate });
      }
    } catch {
      // silent
    }
  },

  submitOrder: async (req) => {
    set({ tradeSubmitting: true, tradeConfirmPending: null });
    try {
      const res = await fetch("/api/trade/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (data.error === "no_credentials") {
        set({ tradeSubmitting: false });
        return;
      }
      // Refresh orders and positions after trade
      get().fetchOrders();
      get().fetchPositions();
      set({ tradeSubmitting: false, orderFormAmount: "" });
    } catch {
      set({ tradeSubmitting: false });
    }
  },

  cancelOrder: async (orderId) => {
    try {
      await fetch("/api/trade/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      get().fetchOrders();
    } catch {
      // silent
    }
  },

  fetchOrders: async () => {
    try {
      const res = await fetch("/api/trade/order");
      if (res.ok) {
        const orders: OrderRecord[] = await res.json();
        set({ orders });
      }
    } catch {
      // silent
    }
  },

  fetchPositions: async () => {
    try {
      const res = await fetch("/api/trade/positions");
      if (res.ok) {
        const positions: PositionRecord[] = await res.json();
        set({ positions });
      }
    } catch {
      // silent
    }
  },

  fetchCredentialStatuses: async () => {
    try {
      const res = await fetch("/api/settings/credentials");
      if (res.ok) {
        const statuses: CredentialStatus[] = await res.json();
        set({ credentialStatuses: statuses });
      }
    } catch {
      // silent
    }
  },

  setOrderFormSide: (side) => set({ orderFormSide: side }),
  setOrderFormType: (type) => set({ orderFormType: type }),
  setOrderFormAmount: (amount) => set({ orderFormAmount: amount }),
  setOrderFormLimitPrice: (price) => set({ orderFormLimitPrice: price }),
  setTradeConfirmPending: (req) => set({ tradeConfirmPending: req }),
  setShowCredentialsModal: (show) => set({ showCredentialsModal: show }),
}));

// Derived data hooks

export function useFilteredMarkets(): Market[] {
  const markets = useTerminalStore((s) => s.markets);
  const searchQuery = useTerminalStore((s) => s.searchQuery);
  const categoryFilter = useTerminalStore((s) => s.categoryFilter);
  const sortField = useTerminalStore((s) => s.sortField);
  const sortDirection = useTerminalStore((s) => s.sortDirection);

  const edgeSignals = useEdgeSignals();

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
        case "edge":
          cmp = (edgeSignals.get(a.id)?.edgeScore || 0) - (edgeSignals.get(b.id)?.edgeScore || 0);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [markets, searchQuery, categoryFilter, sortField, sortDirection, edgeSignals]);
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

export function useArbPairs(): ArbPair[] {
  return useTerminalStore((s) => s.cachedArbPairs);
}

export function useEdgeSignals(): Map<string, EdgeSignal> {
  return useTerminalStore((s) => s.cachedEdgeSignals);
}

export function useAIEdge(): Map<string, AIEdgePrediction> {
  const predictions = useTerminalStore((s) => s.aiEdgePredictions);

  return useMemo(() => {
    const map = new Map<string, AIEdgePrediction>();
    for (const p of predictions) {
      map.set(p.marketId, p);
    }
    return map;
  }, [predictions]);
}

export function useSmartMoneyMap(): Map<string, SmartMoneySignal> {
  const signals = useTerminalStore((s) => s.smartMoneySignals);

  return useMemo(() => {
    const map = new Map<string, SmartMoneySignal>();
    for (const s of signals) {
      map.set(s.marketId, s);
    }
    return map;
  }, [signals]);
}

const ALL_CATEGORIES: Category[] = ["Politics", "Sports", "Crypto", "Tech", "World Events"];

export function useMarketAnalytics(): MarketAnalytics {
  const markets = useTerminalStore((s) => s.markets);

  return useMemo(() => {
    const active = markets.filter((m) => m.status === "active");
    const marketCount = active.length;

    let totalVolume = 0;
    let probSum = 0;
    const sourceSet = new Set<string>();
    const catMap = new Map<Category, { volume: number; count: number; changeSum: number; changes: number[] }>();
    const srcMap = new Map<Market["source"], { volume: number; count: number; probWeightedVol: number }>();

    let bullWeightedVol = 0;
    let bearWeightedVol = 0;
    let bullCount = 0;
    let bearCount = 0;
    let neutralCount = 0;

    let vwapNumerator = 0;
    let vwapDenominator = 0;
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

      const cat = catMap.get(m.category) || { volume: 0, count: 0, changeSum: 0, changes: [] };
      cat.volume += m.volume;
      cat.count += 1;
      cat.changeSum += m.change24h;
      cat.changes.push(m.change24h);
      catMap.set(m.category, cat);

      const src = srcMap.get(m.source) || { volume: 0, count: 0, probWeightedVol: 0 };
      src.volume += m.volume;
      src.count += 1;
      src.probWeightedVol += m.probability * m.volume;
      srcMap.set(m.source, src);

      if (m.probability > 50) {
        bullCount++;
        bullWeightedVol += m.volume;
      } else if (m.probability < 50) {
        bearCount++;
        bearWeightedVol += m.volume;
      } else {
        neutralCount++;
      }

      vwapNumerator += m.probability * m.volume;
      vwapDenominator += m.volume;

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

    const hotMarkets = [...active]
      .map((market) => ({
        market,
        score: Math.abs(market.change24h) * Math.log(market.volume + 1),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const totalSentimentVol = bullWeightedVol + bearWeightedVol || 1;
    const sentiment: SentimentData = {
      bullRatio: bullWeightedVol / totalSentimentVol * 100,
      bearRatio: bearWeightedVol / totalSentimentVol * 100,
      bullCount,
      bearCount,
      neutralCount,
    };

    const volatilityByCategory: VolatilityData[] = ALL_CATEGORIES.map((category) => {
      const stat = catMap.get(category);
      if (!stat || stat.count === 0) return { category, stdDev: 0, maxAbsMove: 0, count: 0 };
      const mean = stat.changeSum / stat.count;
      const variance = stat.changes.reduce((sum, c) => sum + (c - mean) ** 2, 0) / stat.count;
      const maxAbsMove = Math.max(...stat.changes.map(Math.abs));
      return { category, stdDev: Math.sqrt(variance), maxAbsMove, count: stat.count };
    }).sort((a, b) => b.stdDev - a.stdDev);

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

    const sortedByVol = [...active].sort((a, b) => b.volume - a.volume);
    const totalVol = totalVolume || 1;
    const hhi = active.reduce((sum, m) => {
      const share = m.volume / totalVol;
      return sum + share * share;
    }, 0) * 10000;
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

    const mispricingSignals: MispricingSignal[] = [];
    const medianVolume = marketCount > 0
      ? [...active].sort((a, b) => a.volume - b.volume)[Math.floor(marketCount / 2)].volume
      : 0;

    for (const m of active) {
      if ((m.probability < 15 || m.probability > 85) && m.volume > medianVolume * 1.5) {
        const extremeness = m.probability < 50 ? (15 - m.probability) : (m.probability - 85);
        const volRatio = m.volume / (medianVolume || 1);
        mispricingSignals.push({
          market: m,
          type: "overconfidence",
          score: Math.max(0, extremeness) * volRatio,
        });
      }
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

    const categoryMomentum: MomentumData[] = ALL_CATEGORIES.map((category) => {
      const stat = catMap.get(category);
      if (!stat || stat.count === 0) return { category, upPct: 0, downPct: 0, netMomentum: 0, upCount: 0, downCount: 0 };
      const upCount = stat.changes.filter((c) => c > 0).length;
      const downCount = stat.changes.filter((c) => c < 0).length;
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
