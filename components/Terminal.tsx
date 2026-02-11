"use client";

import CommandBar from "./CommandBar";
import MarketTable from "./MarketTable";
import MarketChart from "./MarketChart";
import MarketDetail from "./MarketDetail";
import Watchlist from "./Watchlist";
import AnalyticsPanel from "./AnalyticsPanel";
import Ticker from "./Ticker";
import TrendingPanel from "./TrendingPanel";
import { useTerminalStore } from "@/lib/store";
import { RightPanelTab } from "@/lib/types";

export default function Terminal() {
  const rightPanelTab = useTerminalStore((s) => s.rightPanelTab);
  const setRightPanelTab = useTerminalStore((s) => s.setRightPanelTab);

  return (
    <div className="h-screen flex flex-col bg-terminal-bg text-terminal-text font-mono overflow-hidden">
      {/* Top: Command Bar */}
      <CommandBar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel (60%) */}
        <div className="flex-[3] flex flex-col border-r border-terminal-border min-w-0">
          {/* Top row: Trending (left) + Chart (right) */}
          <div className="flex-[2] flex overflow-hidden border-b border-terminal-border">
            {/* Trending Panel - top left */}
            <div className="flex-1 overflow-hidden border-r border-terminal-border">
              <TrendingPanel />
            </div>
            {/* Chart - top right of left panel */}
            <div className="flex-1 overflow-hidden">
              <MarketChart />
            </div>
          </div>
          {/* Market Table - bottom of left panel */}
          <div className="flex-[3] overflow-hidden">
            <MarketTable />
          </div>
        </div>

        {/* Right Panel (40%) */}
        <div className="flex-[2] flex flex-col min-w-0">
          {/* Market Detail (top) */}
          <div className="flex-1 overflow-hidden border-b border-terminal-border">
            <MarketDetail />
          </div>
          {/* Tabbed Panel (bottom) */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex border-b border-terminal-border">
              {(["watchlist", "analytics"] as RightPanelTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRightPanelTab(tab)}
                  className={`flex-1 px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    rightPanelTab === tab
                      ? "text-terminal-amber border-b border-terminal-amber bg-terminal-bg"
                      : "text-terminal-muted hover:text-terminal-text"
                  }`}
                >
                  {tab === "watchlist" ? "★ Watchlist" : "◆ Analytics"}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              {rightPanelTab === "watchlist" ? <Watchlist /> : <AnalyticsPanel />}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Scrolling Ticker */}
      <Ticker />
    </div>
  );
}
