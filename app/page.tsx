"use client";

import { useEffect, useRef } from "react";
import { useTerminalStore } from "@/lib/store";
import Terminal from "@/components/Terminal";

export default function Home() {
  const initMarkets = useTerminalStore((s) => s.initMarkets);
  const refreshMarkets = useTerminalStore((s) => s.refreshMarkets);
  const simulatePriceUpdate = useTerminalStore((s) => s.simulatePriceUpdate);
  const markets = useTerminalStore((s) => s.markets);
  const loading = useTerminalStore((s) => s.loading);
  const dataSource = useTerminalStore((s) => s.dataSource);
  const initialized = useRef(false);

  // Initialize markets on mount
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initMarkets();
    }
  }, [initMarkets]);

  // Refresh real data every 30 seconds
  useEffect(() => {
    if (markets.length === 0 || dataSource !== "live") return;
    const interval = setInterval(() => {
      refreshMarkets();
    }, 30000);
    return () => clearInterval(interval);
  }, [markets.length, dataSource, refreshMarkets]);

  // Subtle simulated drift every 2 seconds
  useEffect(() => {
    if (markets.length === 0) return;
    const interval = setInterval(() => {
      simulatePriceUpdate();
    }, 2000);
    return () => clearInterval(interval);
  }, [markets.length, simulatePriceUpdate]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-terminal-bg text-terminal-amber font-mono gap-2">
        <div className="text-2xl font-bold">PREDICT</div>
        <div className="text-sm text-terminal-muted">
          Connecting to Polymarket...
        </div>
      </div>
    );
  }

  return <Terminal />;
}
