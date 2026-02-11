"use client";

import { useTerminalStore } from "@/lib/store";
import { Category, RightPanelTab } from "@/lib/types";
import { useRef, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import SearchAutocomplete from "./SearchAutocomplete";
import AlertBell from "./AlertBell";
import AlertPanel from "./AlertPanel";

const categories: Category[] = ["Politics", "Sports", "Crypto", "Tech", "World Events"];
const tabCycle: RightPanelTab[] = ["watchlist", "analytics", "arbitrage"];

export default function CommandBar() {
  const { data: session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchQuery = useTerminalStore((s) => s.searchQuery);
  const categoryFilter = useTerminalStore((s) => s.categoryFilter);
  const setSearchQuery = useTerminalStore((s) => s.setSearchQuery);
  const setCategoryFilter = useTerminalStore((s) => s.setCategoryFilter);
  const markets = useTerminalStore((s) => s.markets);
  const rightPanelTab = useTerminalStore((s) => s.rightPanelTab);
  const setRightPanelTab = useTerminalStore((s) => s.setRightPanelTab);
  const [showAlertPanel, setShowAlertPanel] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchQuery("");
        setCategoryFilter(null);
        inputRef.current?.blur();
        setShowAlertPanel(false);
      }
      // A key to cycle through tabs
      if (
        (e.key === "a" || e.key === "A") &&
        document.activeElement !== inputRef.current
      ) {
        const currentIdx = tabCycle.indexOf(rightPanelTab);
        const nextIdx = (currentIdx + 1) % tabCycle.length;
        setRightPanelTab(tabCycle[nextIdx]);
      }
      // Number keys 1-5 for category filter
      if (!inputRef.current || document.activeElement !== inputRef.current) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 5) {
          const cat = categories[num - 1];
          setCategoryFilter(categoryFilter === cat ? null : cat);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [categoryFilter, setCategoryFilter, setSearchQuery, rightPanelTab, setRightPanelTab]);

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 bg-terminal-panel border-b border-terminal-border">
        <span className="text-terminal-amber font-bold text-sm tracking-wider">
          PREDICT
        </span>
        <span className="text-terminal-muted">│</span>

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search markets... ( / )"
            className="w-full bg-terminal-bg border border-terminal-border px-3 py-1.5 text-sm text-terminal-text font-mono placeholder:text-terminal-muted focus:outline-none focus:border-terminal-amber"
          />
          <SearchAutocomplete />
        </div>

        <span className="text-terminal-muted">│</span>

        <div className="flex gap-1">
          {categories.map((cat, i) => (
            <button
              key={cat}
              onClick={() =>
                setCategoryFilter(categoryFilter === cat ? null : cat)
              }
              className={`px-2 py-1 text-xs font-mono transition-colors ${
                categoryFilter === cat
                  ? "bg-terminal-amber text-terminal-bg"
                  : "text-terminal-muted hover:text-terminal-text"
              }`}
            >
              <span className="text-terminal-amber mr-0.5">{i + 1}</span>
              {cat}
            </button>
          ))}
        </div>

        <span className="text-terminal-muted">│</span>

        <AlertBell onClick={() => setShowAlertPanel(true)} />

        <span className="text-terminal-muted">│</span>

        <span className="text-terminal-muted text-xs font-mono">
          <span className="text-terminal-amber">A</span>:Tab
        </span>
        <span className="text-terminal-muted">│</span>
        <span className="text-terminal-muted text-xs font-mono">
          {markets.length} MKTs
        </span>
        {(() => {
          const dataSource = useTerminalStore.getState().dataSource;
          const sources = new Set(markets.map((m) => m.source));
          sources.delete("mock");
          return (
            <span className={`text-xs font-mono font-bold ${
              dataSource === "live" ? "text-terminal-green" : "text-terminal-amber"
            }`}>
              {dataSource === "live" ? `● LIVE (${sources.size} src)` : "● MOCK"}
            </span>
          );
        })()}

        {session?.user && (
          <>
            <span className="text-terminal-muted">│</span>
            <span className="text-terminal-muted text-xs font-mono truncate max-w-[100px]">
              {session.user.email}
            </span>
            <button
              onClick={() => signOut()}
              className="text-terminal-red text-xs font-mono hover:text-terminal-red/80"
            >
              OUT
            </button>
          </>
        )}
      </div>

      {showAlertPanel && <AlertPanel onClose={() => setShowAlertPanel(false)} />}
    </>
  );
}
