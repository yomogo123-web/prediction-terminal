"use client";

import { useTerminalStore, useFilteredMarkets } from "@/lib/store";
import { SortField } from "@/lib/types";
import { useEffect, useRef, useCallback } from "react";

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

export default function MarketTable() {
  const filteredMarkets = useFilteredMarkets();
  const selectedMarketId = useTerminalStore((s) => s.selectedMarketId);
  const selectMarket = useTerminalStore((s) => s.selectMarket);
  const setSort = useTerminalStore((s) => s.setSort);
  const sortField = useTerminalStore((s) => s.sortField);
  const sortDirection = useTerminalStore((s) => s.sortDirection);
  const tableRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const selectedIndex = filteredMarkets.findIndex(
    (m) => m.id === selectedMarketId
  );

  const navigateMarket = useCallback(
    (direction: number) => {
      const newIndex = Math.max(
        0,
        Math.min(filteredMarkets.length - 1, selectedIndex + direction)
      );
      if (filteredMarkets[newIndex]) {
        selectMarket(filteredMarkets[newIndex].id);
        rowRefs.current
          .get(filteredMarkets[newIndex].id)
          ?.scrollIntoView({ block: "nearest" });
      }
    },
    [filteredMarkets, selectedIndex, selectMarket]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT"
      )
        return;
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
    <div ref={tableRef} className="overflow-auto h-full">
      <table className="w-full text-xs font-mono">
        <thead className="sticky top-0 bg-terminal-panel z-10">
          <tr className="text-terminal-muted border-b border-terminal-border">
            <th className="text-left px-3 py-2 font-normal">
              <button
                onClick={() => setSort("title")}
                className="hover:text-terminal-text"
              >
                MARKET{sortIndicator("title")}
              </button>
            </th>
            <th className="text-right px-3 py-2 font-normal w-20">
              <button
                onClick={() => setSort("probability")}
                className="hover:text-terminal-text"
              >
                PROB%{sortIndicator("probability")}
              </button>
            </th>
            <th className="text-right px-3 py-2 font-normal w-20">
              <button
                onClick={() => setSort("change24h")}
                className="hover:text-terminal-text"
              >
                24H CHG{sortIndicator("change24h")}
              </button>
            </th>
            <th className="text-right px-3 py-2 font-normal w-24">
              <button
                onClick={() => setSort("volume")}
                className="hover:text-terminal-text"
              >
                VOLUME{sortIndicator("volume")}
              </button>
            </th>
            <th className="text-left px-3 py-2 font-normal w-28">CAT</th>
            <th className="text-center px-3 py-2 font-normal w-16">SRC</th>
          </tr>
        </thead>
        <tbody>
          {filteredMarkets.map((market) => {
            const isSelected = market.id === selectedMarketId;
            const probChanged =
              market.probability !== market.previousProbability;
            const probUp = market.probability > market.previousProbability;

            return (
              <tr
                key={market.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(market.id, el);
                }}
                onClick={() => selectMarket(market.id)}
                className={`cursor-pointer border-b border-terminal-border/30 transition-colors ${
                  isSelected
                    ? "bg-terminal-amber/10 border-l-2 border-l-terminal-amber"
                    : "hover:bg-terminal-panel/80"
                }`}
              >
                <td className="px-3 py-2 text-terminal-text truncate max-w-[300px]">
                  {market.title}
                </td>
                <td
                  className={`px-3 py-2 text-right font-bold tabular-nums ${
                    probChanged
                      ? probUp
                        ? "text-terminal-green"
                        : "text-terminal-red"
                      : "text-terminal-text"
                  }`}
                >
                  {market.probability.toFixed(1)}¢
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${
                    market.change24h >= 0
                      ? "text-terminal-green"
                      : "text-terminal-red"
                  }`}
                >
                  {market.change24h >= 0 ? "+" : ""}
                  {market.change24h.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-right text-terminal-muted tabular-nums">
                  {formatVolume(market.volume)}
                </td>
                <td
                  className={`px-3 py-2 ${
                    categoryColors[market.category] || "text-terminal-muted"
                  }`}
                >
                  {market.category}
                </td>
                <td className={`px-3 py-2 text-center text-[10px] ${sourceLabels[market.source]?.color || "text-terminal-muted"}`}>
                  {sourceLabels[market.source]?.label || market.source}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
