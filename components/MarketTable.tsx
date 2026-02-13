"use client";

import { useTerminalStore, useFilteredMarkets, useEdgeSignals, useAIEdge, useSmartMoneyMap } from "@/lib/store";
import { SortField } from "@/lib/types";
import { useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import Sparkline from "./Sparkline";
import { useIsMobile } from "@/lib/hooks/use-media-query";

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

const categoryColors: Record<string, string> = {
  Politics: "text-blue-400",
  Sports: "text-orange-400",
  Crypto: "text-yellow-400",
  Tech: "text-purple-400",
  "World Events": "text-cyan-400",
};

const sourceLabels: Record<string, { label: string; color: string }> = {
  polymarket: { label: "POLY", color: "text-purple-400" },
  kalshi: { label: "KLSH", color: "text-blue-400" },
  manifold: { label: "MNFD", color: "text-green-400" },
  predictit: { label: "PDIT", color: "text-orange-400" },
  mock: { label: "MOCK", color: "text-terminal-muted" },
};

const ROW_HEIGHT = 44;

export default function MarketTable() {
  const filteredMarkets = useFilteredMarkets();
  const edgeSignals = useEdgeSignals();
  const aiEdge = useAIEdge();
  const smartMoneyMap = useSmartMoneyMap();
  const selectedMarketId = useTerminalStore((s) => s.selectedMarketId);
  const selectMarket = useTerminalStore((s) => s.selectMarket);
  const setSort = useTerminalStore((s) => s.setSort);
  const sortField = useTerminalStore((s) => s.sortField);
  const sortDirection = useTerminalStore((s) => s.sortDirection);
  const setMobilePanel = useTerminalStore((s) => s.setMobilePanel);
  const isMobile = useIsMobile();
  const parentRef = useRef<HTMLDivElement>(null);

  const selectedIndex = filteredMarkets.findIndex(
    (m) => m.id === selectedMarketId
  );

  const virtualizer = useVirtualizer({
    count: filteredMarkets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const navigateMarket = useCallback(
    (direction: number) => {
      const newIndex = Math.max(
        0,
        Math.min(filteredMarkets.length - 1, selectedIndex + direction)
      );
      if (filteredMarkets[newIndex]) {
        selectMarket(filteredMarkets[newIndex].id);
        virtualizer.scrollToIndex(newIndex, { align: "auto" });
      }
    },
    [filteredMarkets, selectedIndex, selectMarket, virtualizer]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        navigateMarket(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        navigateMarket(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigateMarket]);

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  return (
    <div ref={parentRef} className="overflow-auto h-full">
      {/* Sticky header */}
      <div className="sticky top-0 bg-terminal-panel z-10 flex text-terminal-muted text-xs font-mono border-b border-terminal-border">
        <div className="flex-1 min-w-0 px-3 py-2">
          <button onClick={() => setSort("title")} className="hover:text-terminal-text">
            MARKET{sortIndicator("title")}
          </button>
        </div>
        <div className="w-20 px-3 py-2 text-right hidden sm:block">
          <button onClick={() => setSort("probability")} className="hover:text-terminal-text">
            PROB%{sortIndicator("probability")}
          </button>
        </div>
        <div className="w-20 px-3 py-2 text-right hidden sm:block">
          <button onClick={() => setSort("change24h")} className="hover:text-terminal-text">
            24H CHG{sortIndicator("change24h")}
          </button>
        </div>
        {/* Mobile: combined column header */}
        <div className="sm:hidden flex-shrink-0 px-2 py-2 text-right">
          <button onClick={() => setSort("probability")} className="hover:text-terminal-text">
            PROB{sortIndicator("probability")}
          </button>
        </div>
        <div className="w-16 px-1 py-2 text-center hidden md:block">
          <span className="text-terminal-muted">7D</span>
        </div>
        <div className="w-24 px-3 py-2 text-right hidden md:block">
          <button onClick={() => setSort("volume")} className="hover:text-terminal-text">
            VOLUME{sortIndicator("volume")}
          </button>
        </div>
        <div className="w-14 px-2 py-2 text-right hidden md:block">
          <span className="text-terminal-muted">AI</span>
        </div>
        <div className="w-28 px-3 py-2 text-left hidden lg:block">CAT</div>
        <div className="w-16 px-3 py-2 text-center hidden lg:block">SRC</div>
        <div className="w-10 px-1 py-2 text-center hidden lg:block">
          <span className="text-terminal-muted">SM</span>
        </div>
        <div className="w-16 px-3 py-2 text-right hidden lg:block">
          <button onClick={() => setSort("edge")} className="hover:text-terminal-text">
            EDGE{sortIndicator("edge")}
          </button>
        </div>
      </div>

      {/* Virtualized rows */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const market = filteredMarkets[virtualRow.index];
          if (!market) return null;
          const isSelected = market.id === selectedMarketId;
          const probChanged = market.probability !== market.previousProbability;
          const probUp = market.probability > market.previousProbability;

          return (
            <div
              key={market.id}
              onClick={() => {
                selectMarket(market.id);
                if (isMobile) setMobilePanel("detail");
              }}
              className={`absolute top-0 left-0 w-full flex items-center cursor-pointer border-b border-terminal-border/30 transition-colors text-xs font-mono ${
                isSelected
                  ? "bg-terminal-amber/10 border-l-2 border-l-terminal-amber"
                  : "hover:bg-terminal-panel/80"
              }`}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="flex-1 min-w-0 px-3 text-terminal-text truncate">
                {market.title}
              </div>
              {/* Desktop: separate prob and change columns */}
              <div
                className={`w-20 px-3 text-right font-bold tabular-nums hidden sm:block ${
                  probChanged
                    ? probUp
                      ? "text-terminal-green"
                      : "text-terminal-red"
                    : "text-terminal-text"
                }`}
              >
                {market.probability.toFixed(1)}¢
              </div>
              <div
                className={`w-20 px-3 text-right tabular-nums hidden sm:block ${
                  market.change24h >= 0 ? "text-terminal-green" : "text-terminal-red"
                }`}
              >
                {market.change24h >= 0 ? "+" : ""}
                {market.change24h.toFixed(1)}
              </div>
              {/* Mobile: compact prob + change in one cell */}
              <div className="sm:hidden flex-shrink-0 px-2 text-right">
                <span className={`font-bold tabular-nums text-xs ${
                  probChanged
                    ? probUp ? "text-terminal-green" : "text-terminal-red"
                    : "text-terminal-text"
                }`}>
                  {market.probability.toFixed(1)}¢
                </span>
                <span className={`text-[10px] tabular-nums ml-1 ${
                  market.change24h >= 0 ? "text-terminal-green" : "text-terminal-red"
                }`}>
                  {market.change24h >= 0 ? "+" : ""}{market.change24h.toFixed(1)}
                </span>
              </div>
              <div className="w-16 px-1 hidden md:flex items-center justify-center">
                <Sparkline
                  marketId={market.id}
                  probability={market.probability}
                  change24h={market.change24h}
                />
              </div>
              <div className="w-24 px-3 text-right text-terminal-muted tabular-nums hidden md:block">
                {formatVolume(market.volume)}
              </div>
              {(() => {
                const ai = aiEdge.get(market.id);
                const div = ai ? Math.round(ai.divergence) : null;
                return (
                  <div className={`w-14 px-2 text-right tabular-nums text-[11px] font-bold hidden md:block ${
                    div === null ? "text-terminal-muted" : div > 0 ? "text-terminal-green" : div < 0 ? "text-terminal-red" : "text-terminal-muted"
                  }`}>
                    {div === null ? "\u00b7" : `${div > 0 ? "+" : ""}${div}`}
                  </div>
                );
              })()}
              <div className={`w-28 px-3 hidden lg:block ${categoryColors[market.category] || "text-terminal-muted"}`}>
                {market.category}
              </div>
              <div className={`w-16 px-3 text-center text-[10px] hidden lg:block ${sourceLabels[market.source]?.color || "text-terminal-muted"}`}>
                {sourceLabels[market.source]?.label || market.source}
              </div>
              {(() => {
                const sm = smartMoneyMap.get(market.id);
                if (!sm) return (
                  <div className="w-10 px-1 text-center text-[10px] text-terminal-muted hidden lg:block">&middot;</div>
                );
                const count = sm.yesTraderCount + sm.noTraderCount;
                const label = sm.netDirection === "YES"
                  ? `${count}Y`
                  : sm.netDirection === "NO"
                  ? `${count}N`
                  : `${count}M`;
                const color = sm.netDirection === "YES"
                  ? "text-terminal-green"
                  : sm.netDirection === "NO"
                  ? "text-terminal-red"
                  : "text-amber-400";
                return (
                  <div className={`w-10 px-1 text-center text-[10px] font-bold hidden lg:block ${color}`}>
                    {label}
                  </div>
                );
              })()}
              {(() => {
                const edge = edgeSignals.get(market.id);
                const score = edge?.edgeScore || 0;
                return (
                  <div className={`w-16 px-3 text-right tabular-nums font-bold hidden lg:block ${
                    score > 15 ? "text-terminal-green" : score < -15 ? "text-terminal-red" : "text-terminal-muted"
                  }`}>
                    {score > 0 ? "+" : ""}{score}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
