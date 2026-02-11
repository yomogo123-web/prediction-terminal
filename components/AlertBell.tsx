"use client";

import { useTerminalStore } from "@/lib/store";

export default function AlertBell({ onClick }: { onClick: () => void }) {
  const alerts = useTerminalStore((s) => s.alerts);
  const activeCount = alerts.filter((a) => a.active).length;

  return (
    <button
      onClick={onClick}
      className="relative text-terminal-muted hover:text-terminal-text transition-colors text-xs font-mono"
      title="Alerts"
    >
      <span>{activeCount > 0 ? "🔔" : "🔕"}</span>
      {activeCount > 0 && (
        <span className="absolute -top-1 -right-2 bg-terminal-amber text-terminal-bg text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
          {activeCount}
        </span>
      )}
    </button>
  );
}
