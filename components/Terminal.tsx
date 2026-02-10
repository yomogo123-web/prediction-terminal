"use client";

import CommandBar from "./CommandBar";
import MarketTable from "./MarketTable";
import MarketChart from "./MarketChart";
import MarketDetail from "./MarketDetail";
import Watchlist from "./Watchlist";
import Ticker from "./Ticker";
import TrendingPanel from "./TrendingPanel";

export default function Terminal() {
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
          {/* Watchlist (bottom) */}
          <div className="flex-1 overflow-hidden">
            <Watchlist />
          </div>
        </div>
      </div>

      {/* Bottom: Scrolling Ticker */}
      <Ticker />
    </div>
  );
}
