"use client";

import { useTerminalStore } from "@/lib/store";

export default function MobileNav() {
  const mobilePanel = useTerminalStore((s) => s.mobilePanel);
  const setMobilePanel = useTerminalStore((s) => s.setMobilePanel);

  const tabs: { id: "table" | "detail" | "tabs"; label: string }[] = [
    { id: "table", label: "TABLE" },
    { id: "detail", label: "DETAIL" },
    { id: "tabs", label: "PANELS" },
  ];

  return (
    <div className="lg:hidden flex border-t border-terminal-border bg-terminal-panel">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setMobilePanel(tab.id)}
          className={`flex-1 py-3 text-xs font-mono font-bold tracking-wider transition-colors min-h-[48px] ${
            mobilePanel === tab.id
              ? "text-terminal-amber border-t-2 border-terminal-amber bg-terminal-bg"
              : "text-terminal-muted hover:text-terminal-text"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
