"use client";

import CommandBar from "./CommandBar";
import MarketTable from "./MarketTable";
import MarketChart from "./MarketChart";
import MarketDetail from "./MarketDetail";
import Watchlist from "./Watchlist";
import Ticker from "./Ticker";
import TopMovers from "./TopMovers";

export default function Terminal() {
  return (
    <div className="h-screen flex flex-col bg-terminal-bg text-terminal-text font-mono overflow-hidden">
      {/* Top: Command Bar */}
      <CommandBar />

      {/* Top Movers Strip */}
      <TopMovers />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel (60%) */}
        <div className="flex-[3] flex flex-col border-r border-terminal-border min-w-0">
          {/* Market Table (top half) */}
          <div className="flex-1 overflow-hidden border-b border-terminal-border">
            <MarketTable />
          </div>
          {/* Chart (bottom half) */}
          <div className="flex-1 overflow-hidden">
            <MarketChart />
          </div>
        </div>

        {/* Right Panel (40%) */}
        <div className="flex-[2] flex flex-col min-w-0">
          {/* Market Detail (top half) */}
          <div className="flex-1 overflow-hidden border-b border-terminal-border">
            <MarketDetail />
          </div>
          {/* Watchlist (bottom half) */}
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
