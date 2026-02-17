"use client";

import { useEffect } from "react";
import { useTerminalStore } from "@/lib/store";
import { hapticNotification } from "@/lib/capacitor";

export default function Toast() {
  const triggeredAlerts = useTerminalStore((s) => s.triggeredAlerts);
  const dismissTriggeredAlert = useTerminalStore((s) => s.dismissTriggeredAlert);
  const markets = useTerminalStore((s) => s.markets);

  // Auto-dismiss each alert after 5 seconds
  useEffect(() => {
    if (triggeredAlerts.length === 0) return;
    const timers = triggeredAlerts.map((alert) =>
      setTimeout(() => dismissTriggeredAlert(alert.id), 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, [triggeredAlerts, dismissTriggeredAlert]);

  // Haptic on new alert
  useEffect(() => {
    if (triggeredAlerts.length === 0) return;
    hapticNotification('warning');
  }, [triggeredAlerts.length]);

  // Beep on new alert (using sound system)
  useEffect(() => {
    if (triggeredAlerts.length === 0) return;
    import("@/lib/sound").then(({ playAlertSound }) => {
      playAlertSound("beep");
    });
  }, [triggeredAlerts.length]);

  if (triggeredAlerts.length === 0) return null;

  const getMarketTitle = (marketId: string) => {
    const m = markets.find((mk) => mk.id === marketId);
    return m ? m.title : marketId;
  };

  return (
    <div className="fixed bottom-20 lg:bottom-10 right-4 z-50 flex flex-col gap-2 font-mono">
      {triggeredAlerts.slice(-3).map((alert) => (
        <div
          key={alert.id}
          className="bg-terminal-panel border border-terminal-amber/50 px-4 py-2 shadow-lg max-w-xs animate-pulse"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-terminal-amber text-[10px] font-bold uppercase tracking-wider">
              Alert Triggered
            </span>
            <button
              onClick={() => dismissTriggeredAlert(alert.id)}
              className="text-terminal-muted hover:text-terminal-text text-xs"
            >
              ✕
            </button>
          </div>
          <div className="text-xs text-terminal-text mt-1 truncate">
            {getMarketTitle(alert.marketId).slice(0, 50)}
          </div>
          <div className="text-[10px] text-terminal-muted mt-0.5">
            {alert.condition === "above" ? "Prob above" : alert.condition === "below" ? "Prob below" : "Change ≥"}{" "}
            {alert.threshold}{alert.condition === "change" ? "pts" : "¢"}
          </div>
        </div>
      ))}
    </div>
  );
}
