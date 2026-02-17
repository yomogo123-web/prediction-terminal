"use client";

import { useTerminalStore } from "@/lib/store";

const categoryColors: Record<string, string> = {
  Politics: "text-blue-400",
  Sports: "text-orange-400",
  Crypto: "text-yellow-400",
  Tech: "text-purple-400",
  "World Events": "text-cyan-400",
};

export default function EventCalendar() {
  const calendarEvents = useTerminalStore((s) => s.calendarEvents);
  const selectMarket = useTerminalStore((s) => s.selectMarket);
  const selectedMarketId = useTerminalStore((s) => s.selectedMarketId);
  const markets = useTerminalStore((s) => s.markets);

  // Find selected market's category for highlighting
  const selectedMarket = markets.find((m) => m.id === selectedMarketId);
  const selectedCategory = selectedMarket?.category;

  if (calendarEvents.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center px-3 py-1.5 border-b border-terminal-border">
          <span className="text-terminal-muted text-[9px] uppercase tracking-wider">Event Calendar</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono">
          No upcoming events
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-[9px] uppercase tracking-wider">Event Calendar</span>
        <span className="text-terminal-amber text-[9px] font-bold">
          {calendarEvents.length} EVENTS
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        {calendarEvents.map((event) => {
          const isHighlighted = selectedCategory === event.category;
          const eventDate = new Date(event.date);
          const dateLabel = eventDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <div
              key={event.id}
              className={`px-3 py-2 border-b border-terminal-border/30 ${
                isHighlighted ? "bg-terminal-amber/5 border-l-2 border-l-terminal-amber" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-mono font-bold ${
                  event.daysUntil <= 7 ? "text-terminal-red" : event.daysUntil <= 30 ? "text-terminal-amber" : "text-terminal-muted"
                }`}>
                  {event.daysUntil === 0 ? "TODAY" : event.daysUntil === 1 ? "1 DAY" : `${event.daysUntil} DAYS`}
                </span>
                <span className={`text-[9px] font-mono ${categoryColors[event.category] || "text-terminal-muted"}`}>
                  {event.category.toUpperCase()}
                </span>
              </div>
              <div className="text-xs font-mono text-terminal-text">{event.title}</div>
              <div className="text-[10px] font-mono text-terminal-muted mt-0.5">{dateLabel}</div>

              {/* Relevant markets */}
              {event.relevantMarketIds.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {event.relevantMarketIds.slice(0, 3).map((mId) => {
                    const m = markets.find((mk) => mk.id === mId);
                    if (!m) return null;
                    return (
                      <button
                        key={mId}
                        onClick={() => selectMarket(mId)}
                        className="block text-[9px] font-mono text-terminal-amber/70 hover:text-terminal-amber truncate w-full text-left"
                      >
                        → {m.title.slice(0, 45)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
