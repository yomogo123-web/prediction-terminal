"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTerminalStore } from "@/lib/store";
import { checkAlerts } from "@/lib/alert-checker";
import Terminal from "@/components/Terminal";
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const { data: session, status } = useSession();
  const [showAuth, setShowAuth] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const initMarkets = useTerminalStore((s) => s.initMarkets);
  const refreshMarkets = useTerminalStore((s) => s.refreshMarkets);
  const fetchNews = useTerminalStore((s) => s.fetchNews);
  const fetchAIEdge = useTerminalStore((s) => s.fetchAIEdge);
  const simulatePriceUpdate = useTerminalStore((s) => s.simulatePriceUpdate);
  const markets = useTerminalStore((s) => s.markets);
  const loading = useTerminalStore((s) => s.loading);
  const dataSource = useTerminalStore((s) => s.dataSource);
  const setWatchlist = useTerminalStore((s) => s.setWatchlist);
  const setAlerts = useTerminalStore((s) => s.setAlerts);
  const alerts = useTerminalStore((s) => s.alerts);
  const triggerAlerts = useTerminalStore((s) => s.triggerAlerts);
  const initialized = useRef(false);

  // Show auth modal on first load if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session && !guestMode) {
      setShowAuth(true);
    }
  }, [status, session, guestMode]);

  // Hydrate watchlist and alerts from DB on login
  useEffect(() => {
    if (!session) return;
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((ids: string[]) => { if (Array.isArray(ids)) setWatchlist(ids); })
      .catch(() => {});
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAlerts(data); })
      .catch(() => {});
  }, [session, setWatchlist, setAlerts]);

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

  // Fetch news on init and poll every 5 minutes
  useEffect(() => {
    if (markets.length === 0) return;
    fetchNews();
    const interval = setInterval(() => {
      fetchNews();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [markets.length, fetchNews]);

  // Fetch AI edge predictions on init and poll every 15 minutes
  useEffect(() => {
    if (markets.length === 0) return;
    fetchAIEdge();
    const interval = setInterval(() => {
      fetchAIEdge();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [markets.length, fetchAIEdge]);

  // Check alerts callback
  const runAlertCheck = useCallback(() => {
    if (alerts.length === 0 || markets.length === 0) return;
    const triggered = checkAlerts(markets, alerts);
    if (triggered.length > 0) {
      triggerAlerts(triggered.map((a) => a.id));
    }
  }, [markets, alerts, triggerAlerts]);

  // Subtle simulated drift every 2 seconds + alert check
  useEffect(() => {
    if (markets.length === 0) return;
    const interval = setInterval(() => {
      simulatePriceUpdate();
      runAlertCheck();
    }, 2000);
    return () => clearInterval(interval);
  }, [markets.length, simulatePriceUpdate, runAlertCheck]);

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

  return (
    <>
      {showAuth && !session && (
        <AuthModal
          onSuccess={() => {
            setShowAuth(false);
            setGuestMode(true);
          }}
        />
      )}
      <Terminal />
    </>
  );
}
