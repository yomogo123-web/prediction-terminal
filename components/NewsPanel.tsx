"use client";

import { useTerminalStore } from "@/lib/store";

function timeAgo(dateStr: string): string {
  try {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.max(0, now - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

export default function NewsPanel() {
  const newsItems = useTerminalStore((s) => s.newsItems);
  const newsLoading = useTerminalStore((s) => s.newsLoading);
  const markets = useTerminalStore((s) => s.markets);
  const selectMarket = useTerminalStore((s) => s.selectMarket);

  if (newsLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center px-3 py-1.5 border-b border-terminal-border">
          <span className="text-terminal-muted text-[9px] uppercase tracking-wider">
            News Correlation
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono">
          Loading news feeds...
        </div>
      </div>
    );
  }

  if (newsItems.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center px-3 py-1.5 border-b border-terminal-border">
          <span className="text-terminal-muted text-[9px] uppercase tracking-wider">
            News Correlation
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono p-4 text-center">
          No news available.
          <br />
          News updates every 5 minutes.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-[9px] uppercase tracking-wider">
          News Correlation
        </span>
        <span className="text-terminal-amber text-[9px] font-bold">
          {newsItems.length} ITEMS
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        {newsItems.map((item) => (
          <div
            key={item.id}
            className="px-3 py-2 border-b border-terminal-border/30 hover:bg-terminal-panel/80"
          >
            <div className="flex items-start gap-2">
              <span className="text-terminal-muted text-[9px] flex-shrink-0 w-[40px] tabular-nums font-mono pt-0.5">
                {timeAgo(item.publishedAt)}
              </span>
              <div className="flex-1 min-w-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    // Also select top correlated market if any
                    if (item.correlatedMarketIds.length > 0) {
                      const idx = parseInt(item.correlatedMarketIds[0]?.replace("mkt-", "") || "");
                      if (!isNaN(idx) && markets[idx]) {
                        selectMarket(markets[idx].id);
                      }
                    }
                  }}
                  className="text-terminal-text text-[11px] font-mono leading-tight hover:text-terminal-amber transition-colors cursor-pointer block"
                >
                  {item.title}
                </a>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-mono px-1 py-0.5 bg-terminal-bg border border-terminal-border text-terminal-muted">
                    {item.source}
                  </span>
                  {item.correlatedMarketIds.slice(0, 2).map((mid) => {
                    const idx = parseInt(mid.replace("mkt-", ""));
                    const m = !isNaN(idx) ? markets[idx] : null;
                    if (!m) return null;
                    return (
                      <button
                        key={mid}
                        onClick={() => selectMarket(m.id)}
                        className="text-[9px] font-mono px-1 py-0.5 bg-terminal-amber/10 border border-terminal-amber/30 text-terminal-amber hover:bg-terminal-amber/20 transition-colors truncate max-w-[120px]"
                      >
                        {m.title.slice(0, 25)}{m.title.length > 25 ? "..." : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
