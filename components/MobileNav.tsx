"use client";

import { useTerminalStore } from "@/lib/store";
import { hapticLight } from "@/lib/capacitor";

export default function MobileNav() {
  const mobilePanel = useTerminalStore((s) => s.mobilePanel);
  const setMobilePanel = useTerminalStore((s) => s.setMobilePanel);
  const newsItems = useTerminalStore((s) => s.newsItems);

  const tabs: { id: "table" | "detail" | "chart" | "tabs"; label: string; icon: string }[] = [
    { id: "table", label: "Table", icon: "≡" },
    { id: "detail", label: "Detail", icon: "◉" },
    { id: "chart", label: "Chart", icon: "▤" },
    { id: "tabs", label: "Panels", icon: "⊞" },
  ];

  return (
    <div className="lg:hidden flex border-t border-terminal-border bg-terminal-panel pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => { hapticLight(); setMobilePanel(tab.id); }}
          className={`flex-1 py-3 text-xs font-mono font-bold tracking-wider transition-colors min-h-[48px] relative ${
            mobilePanel === tab.id
              ? "text-terminal-amber border-t-2 border-terminal-amber bg-terminal-bg"
              : "text-terminal-muted hover:text-terminal-text"
          }`}
        >
          <span className="mr-1">{tab.icon}</span>
          {tab.label}
          {tab.id === "tabs" && newsItems.length > 0 && (
            <span className="absolute top-2 right-[calc(50%-8px)] translate-x-[18px] w-1.5 h-1.5 rounded-full bg-terminal-amber" />
          )}
        </button>
      ))}
    </div>
  );
}
