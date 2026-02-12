"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTerminalStore } from "@/lib/store";
import { fuzzySearch } from "@/lib/fuzzy-search";

const sourceLabels: Record<string, { label: string; color: string }> = {
  polymarket: { label: "POLY", color: "text-purple-400" },
  kalshi: { label: "KLSH", color: "text-blue-400" },
  manifold: { label: "MNFD", color: "text-green-400" },
  predictit: { label: "PDIT", color: "text-orange-400" },
  mock: { label: "MOCK", color: "text-terminal-muted" },
};

export default function SearchAutocomplete() {
  const markets = useTerminalStore((s) => s.markets);
  const searchQuery = useTerminalStore((s) => s.searchQuery);
  const setSearchQuery = useTerminalStore((s) => s.setSearchQuery);
  const selectMarket = useTerminalStore((s) => s.selectMarket);
  const [results, setResults] = useState<ReturnType<typeof fuzzySearch>>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const res = fuzzySearch(markets, searchQuery);
      setResults(res);
      setSelectedIdx(0);
      setIsOpen(res.length > 0);
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, markets]);

  const handleSelect = useCallback(
    (marketId: string) => {
      selectMarket(marketId);
      setSearchQuery("");
      setIsOpen(false);
      // Blur input
      (document.activeElement as HTMLElement)?.blur();
    },
    [selectMarket, setSearchQuery]
  );

  // Keyboard navigation inside autocomplete
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName !== "INPUT") return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results[selectedIdx]) {
        e.preventDefault();
        handleSelect(results[selectedIdx].market.id);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, results, selectedIdx, handleSelect]);

  if (!isOpen || results.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-0.5 bg-terminal-panel border border-terminal-border z-50 max-h-[50vh] overflow-auto shadow-lg">
      {results.map((result, i) => (
        <div
          key={result.market.id}
          onMouseDown={(e) => {
            e.preventDefault();
            handleSelect(result.market.id);
          }}
          onMouseEnter={() => setSelectedIdx(i)}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-mono cursor-pointer ${
            i === selectedIdx
              ? "bg-terminal-amber/10 text-terminal-text"
              : "text-terminal-muted hover:bg-terminal-panel/80"
          }`}
        >
          <span className={`flex-shrink-0 text-[10px] w-8 ${sourceLabels[result.market.source]?.color || "text-terminal-muted"}`}>
            {sourceLabels[result.market.source]?.label || result.market.source}
          </span>
          <span className="truncate flex-1 text-terminal-text">
            {result.market.title}
          </span>
          <span className="flex-shrink-0 tabular-nums text-terminal-amber">
            {result.market.probability.toFixed(1)}¢
          </span>
        </div>
      ))}
    </div>
  );
}
