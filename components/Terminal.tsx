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
import ErrorBoundary from "./ErrorBoundary";
import CommandPalette from "./CommandPalette";
import InstallPrompt from "./InstallPrompt";
import PortfolioDashboard from "./PortfolioDashboard";
import IndexPanel from "./IndexPanel";
import LeaderboardPanel from "./LeaderboardPanel";
import EventCalendar from "./EventCalendar";
import BacktestPanel from "./BacktestPanel";
import { useTerminalStore } from "@/lib/store";
import { RightPanelTab } from "@/lib/types";

function TabContent({ tab }: { tab: RightPanelTab }) {
  if (tab === "watchlist") return <Watchlist />;
  if (tab === "analytics") return <AnalyticsPanel />;
  if (tab === "arbitrage") return <ArbitragePanel />;
  if (tab === "aitrack") return <AITrackPanel />;
  if (tab === "trading") return <TradingPanel />;
  if (tab === "portfolio") return <PortfolioDashboard />;
  if (tab === "indexes") return <IndexPanel />;
  if (tab === "leaderboard") return <LeaderboardPanel />;
  if (tab === "events") return <EventCalendar />;
  if (tab === "backtest") return <BacktestPanel />;
  return <NewsPanel />;
}

const TAB_LABELS: Record<RightPanelTab, string> = {
  watchlist: "★ Watch",
  analytics: "◆ Stats",
  arbitrage: "⇄ Arb",
  news: "◎ News",
  aitrack: "⊙ AI",
  trading: "$ Trade",
  portfolio: "◈ Folio",
  indexes: "▦ Index",
  leaderboard: "⊕ Rank",
  events: "◉ Events",
  backtest: "⟳ Bktest",
};

const ALL_TABS: RightPanelTab[] = [
  "watchlist", "analytics", "arbitrage", "news", "aitrack", "trading",
  "portfolio", "indexes", "leaderboard", "events", "backtest",
];

function TabBar({ rightPanelTab, setRightPanelTab }: { rightPanelTab: RightPanelTab; setRightPanelTab: (tab: RightPanelTab) => void }) {
  return (
    <div className="flex border-b border-terminal-border overflow-x-auto scrollbar-none">
      {ALL_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setRightPanelTab(tab)}
          className={`flex-shrink-0 px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
            rightPanelTab === tab
              ? "text-terminal-amber border-b border-terminal-amber bg-terminal-bg"
              : "text-terminal-muted hover:text-terminal-text"
          }`}
        >
          {TAB_LABELS[tab]}
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
              <ErrorBoundary label="Trending">
                <TrendingPanel />
              </ErrorBoundary>
            </div>
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary label="Chart">
                <MarketChart />
              </ErrorBoundary>
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
            <ErrorBoundary label="Market Detail">
              <MarketDetail />
            </ErrorBoundary>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <TabBar rightPanelTab={rightPanelTab} setRightPanelTab={setRightPanelTab} />
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary label={rightPanelTab}>
                <TabContent tab={rightPanelTab} />
              </ErrorBoundary>
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
              <ErrorBoundary label="Chart">
                <MarketChart />
              </ErrorBoundary>
            </div>
            <div className="h-[55%] min-h-[200px]">
              <ErrorBoundary label="Trending">
                <TrendingPanel />
              </ErrorBoundary>
            </div>
          </div>
        )}
        {mobilePanel === "tabs" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <TabBar rightPanelTab={rightPanelTab} setRightPanelTab={setRightPanelTab} />
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary label={rightPanelTab}>
                <TabContent tab={rightPanelTab} />
              </ErrorBoundary>
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Scrolling Ticker */}
      <Ticker />

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Toast overlay */}
      <Toast />

      {/* Trade confirmation dialog */}
      <TradeConfirmDialog />

      {/* Credentials modal */}
      <CredentialsModal />

      {/* Command palette */}
      <CommandPalette />

      {/* PWA install prompt */}
      <InstallPrompt />
    </div>
  );
}
