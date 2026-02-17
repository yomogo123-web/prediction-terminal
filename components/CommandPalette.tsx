"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTerminalStore } from "@/lib/store";
import { RightPanelTab } from "@/lib/types";
import { fuzzySearch } from "@/lib/fuzzy-search";

interface Command {
  id: string;
  label: string;
  category: string;
  action: () => void;
}

export default function CommandPalette() {
  const commandPaletteOpen = useTerminalStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useTerminalStore((s) => s.setCommandPaletteOpen);
  const markets = useTerminalStore((s) => s.markets);
  const selectMarket = useTerminalStore((s) => s.selectMarket);
  const setRightPanelTab = useTerminalStore((s) => s.setRightPanelTab);
  const toggleWatchlist = useTerminalStore((s) => s.toggleWatchlist);
  const selectedMarketId = useTerminalStore((s) => s.selectedMarketId);
  const setCategoryFilter = useTerminalStore((s) => s.setCategoryFilter);
  const setMobilePanel = useTerminalStore((s) => s.setMobilePanel);

  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  const commands = useMemo((): Command[] => {
    const cmds: Command[] = [];

    // Tab navigation
    const tabs: [RightPanelTab, string][] = [
      ["watchlist", "Watchlist"],
      ["analytics", "Analytics"],
      ["arbitrage", "Arbitrage"],
      ["news", "News"],
      ["aitrack", "AI Track"],
      ["trading", "Trading"],
      ["portfolio", "Portfolio"],
      ["indexes", "Indexes"],
      ["leaderboard", "Leaderboard"],
      ["events", "Events"],
      ["backtest", "Backtest"],
    ];
    for (const [tab, label] of tabs) {
      cmds.push({
        id: `tab-${tab}`,
        label: `Go to ${label}`,
        category: "Navigation",
        action: () => {
          setRightPanelTab(tab);
          setCommandPaletteOpen(false);
        },
      });
    }

    // Category filters
    const categories = ["Politics", "Sports", "Crypto", "Tech", "World Events"] as const;
    for (const cat of categories) {
      cmds.push({
        id: `cat-${cat}`,
        label: `Filter: ${cat}`,
        category: "Filter",
        action: () => {
          setCategoryFilter(cat);
          setCommandPaletteOpen(false);
        },
      });
    }
    cmds.push({
      id: "cat-clear",
      label: "Clear category filter",
      category: "Filter",
      action: () => {
        setCategoryFilter(null);
        setCommandPaletteOpen(false);
      },
    });

    // Watchlist toggle
    if (selectedMarketId) {
      cmds.push({
        id: "toggle-watchlist",
        label: "Toggle watchlist for selected market",
        category: "Action",
        action: () => {
          toggleWatchlist(selectedMarketId);
          setCommandPaletteOpen(false);
        },
      });
    }

    // Mobile panels
    cmds.push({
      id: "mobile-table",
      label: "Show market table",
      category: "View",
      action: () => { setMobilePanel("table"); setCommandPaletteOpen(false); },
    });
    cmds.push({
      id: "mobile-detail",
      label: "Show market detail",
      category: "View",
      action: () => { setMobilePanel("detail"); setCommandPaletteOpen(false); },
    });
    cmds.push({
      id: "mobile-chart",
      label: "Show chart",
      category: "View",
      action: () => { setMobilePanel("chart"); setCommandPaletteOpen(false); },
    });

    return cmds;
  }, [selectedMarketId, selectMarket, setRightPanelTab, toggleWatchlist, setCategoryFilter, setMobilePanel, setCommandPaletteOpen]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 15);

    const q = query.toLowerCase();
    // First, search markets
    const marketResults = fuzzySearch(markets, query).map((r) => ({
      id: `market-${r.market.id}`,
      label: r.market.title,
      category: "Market",
      action: () => {
        selectMarket(r.market.id);
        setCommandPaletteOpen(false);
      },
    }));

    // Then filter commands
    const cmdResults = commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );

    return [...marketResults, ...cmdResults].slice(0, 15);
  }, [query, commands, markets, selectMarket, setCommandPaletteOpen]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setCommandPaletteOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && filtered[selectedIdx]) {
      e.preventDefault();
      filtered[selectedIdx].action();
      return;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/70"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="bg-terminal-panel border border-terminal-border w-[500px] max-w-[90vw] font-mono shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-3 py-2 border-b border-terminal-border gap-2">
          <span className="text-terminal-amber text-xs">{">"}</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search markets..."
            className="flex-1 bg-transparent text-sm text-terminal-text font-mono focus:outline-none placeholder:text-terminal-muted"
          />
          <span className="text-[9px] text-terminal-muted px-1 border border-terminal-border">ESC</span>
        </div>
        <div ref={listRef} className="max-h-[40vh] overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-terminal-muted">
              No results found
            </div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                onClick={() => item.action()}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                  i === selectedIdx
                    ? "bg-terminal-amber/10 text-terminal-amber"
                    : "text-terminal-text hover:bg-terminal-panel/80"
                }`}
              >
                <span className="text-[9px] text-terminal-muted w-16 flex-shrink-0 uppercase">
                  {item.category}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            ))
          )}
        </div>
        <div className="flex items-center gap-3 px-3 py-1.5 border-t border-terminal-border text-[9px] text-terminal-muted">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
