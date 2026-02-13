"use client";

import CommandBar from "./CommandBar";
import MarketTable from "./MarketTable";
import MarketChart from "./MarketChart";
import MarketDetail from "./MarketDetail";
import Watchlist from "./Watchlist";
import AnalyticsPanel from "./AnalyticsPanel";
import ArbitragePanel from "./ArbitragePanel";
import NewsPanel from "./NewsPanel";
import AITrackPanel from "./AITrackPanel";
import TradingPanel from "./TradingPanel";
import TradeConfirmDialog from "./TradeConfirmDialog";
import CredentialsModal from "./CredentialsModal";
import Ticker from "./Ticker";
import TrendingPanel from "./TrendingPanel";
import MobileNav from "./MobileNav";
import Toast from "./Toast";
import { useTerminalStore } from "@/lib/store";
import { RightPanelTab } from "@/lib/types";

function TabContent({ tab }: { tab: RightPanelTab }) {
  if (tab === "watchlist") return <Watchlist />;
  if (tab === "analytics") return <AnalyticsPanel />;
  if (tab === "arbitrage") return <ArbitragePanel />;
  if (tab === "aitrack") return <AITrackPanel />;
  if (tab === "trading") return <TradingPanel />;
  return <NewsPanel />;
}

function TabBar({ rightPanelTab, setRightPanelTab }: { rightPanelTab: RightPanelTab; setRightPanelTab: (tab: RightPanelTab) => void }) {
  return (
    <div className="flex border-b border-terminal-border">
      {(["watchlist", "analytics", "arbitrage", "news", "aitrack", "trading"] as RightPanelTab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => setRightPanelTab(tab)}
          className={`flex-1 px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
            rightPanelTab === tab
              ? "text-terminal-amber border-b border-terminal-amber bg-terminal-bg"
              : "text-terminal-muted hover:text-terminal-text"
          }`}
        >
          {tab === "watchlist" ? "★ Watch" : tab === "analytics" ? "◆ Analytics" : tab === "arbitrage" ? "⇄ Arb" : tab === "news" ? "◎ News" : tab === "aitrack" ? "⊙ AI Track" : "$ Trade"}
        </button>
      ))}
    </div>
  );
}

export default function Terminal() {
  const rightPanelTab = useTerminalStore((s) => s.rightPanelTab);
  const setRightPanelTab = useTerminalStore((s) => s.setRightPanelTab);
  const mobilePanel = useTerminalStore((s) => s.mobilePanel);

  return (
    <div className="h-[100dvh] flex flex-col bg-terminal-bg text-terminal-text font-mono overflow-hidden">
      {/* Top: Command Bar */}
      <CommandBar />

      {/* Desktop Layout (lg+) */}
      <div className="flex-1 hidden lg:flex overflow-hidden">
        {/* Left Panel (60%) */}
        <div className="flex-[3] flex flex-col border-r border-terminal-border min-w-0">
          {/* Top row: Trending (left) + Chart (right) */}
          <div className="flex-[2] flex overflow-hidden border-b border-terminal-border">
            <div className="flex-1 overflow-hidden border-r border-terminal-border">
              <TrendingPanel />
            </div>
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
          <div className="flex-1 overflow-hidden border-b border-terminal-border">
            <MarketDetail />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <TabBar rightPanelTab={rightPanelTab} setRightPanelTab={setRightPanelTab} />
            <div className="flex-1 overflow-hidden">
              <TabContent tab={rightPanelTab} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Layout (<lg) */}
      <div className="flex-1 flex flex-col lg:hidden overflow-hidden">
        {mobilePanel === "table" && (
          <div className="flex-1 overflow-hidden">
            <MarketTable />
          </div>
        )}
        {mobilePanel === "detail" && (
          <div className="flex-1 overflow-hidden">
            <MarketDetail />
          </div>
        )}
        {mobilePanel === "chart" && (
          <div className="flex-1 overflow-auto">
            <div className="h-[45%] min-h-[200px] border-b border-terminal-border">
              <MarketChart />
            </div>
            <div className="h-[55%] min-h-[200px]">
              <TrendingPanel />
            </div>
          </div>
        )}
        {mobilePanel === "tabs" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <TabBar rightPanelTab={rightPanelTab} setRightPanelTab={setRightPanelTab} />
            <div className="flex-1 overflow-hidden">
              <TabContent tab={rightPanelTab} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Scrolling Ticker (desktop only) */}
      <div className="hidden lg:block">
        <Ticker />
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Toast overlay */}
      <Toast />

      {/* Trade confirmation dialog */}
      <TradeConfirmDialog />

      {/* Credentials modal */}
      <CredentialsModal />
    </div>
  );
}
