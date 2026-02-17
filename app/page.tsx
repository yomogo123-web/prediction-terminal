"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTerminalStore } from "@/lib/store";
import { checkAlerts } from "@/lib/alert-checker";
import { usePolymarketWS } from "@/lib/hooks/use-polymarket-ws";
import Terminal from "@/components/Terminal";
import AuthModal from "@/components/AuthModal";
import { initPushNotifications, setupPushListeners } from "@/lib/push-notifications";

export default function Home() {
  const { data: session, status } = useSession();
  const [showAuth, setShowAuth] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const initMarkets = useTerminalStore((s) => s.initMarkets);
  const refreshMarkets = useTerminalStore((s) => s.refreshMarkets);
  const fetchNews = useTerminalStore((s) => s.fetchNews);
  const fetchAIEdge = useTerminalStore((s) => s.fetchAIEdge);
  const fetchAITrack = useTerminalStore((s) => s.fetchAITrack);
  const checkResolutions = useTerminalStore((s) => s.checkResolutions);
  const fetchSmartMoney = useTerminalStore((s) => s.fetchSmartMoney);
  const fetchCredentialStatuses = useTerminalStore((s) => s.fetchCredentialStatuses);
  const fetchOrders = useTerminalStore((s) => s.fetchOrders);
  const fetchPositions = useTerminalStore((s) => s.fetchPositions);
  const fetchPortfolio = useTerminalStore((s) => s.fetchPortfolio);
  const fetchIndexes = useTerminalStore((s) => s.fetchIndexes);
  const fetchLeaderboard = useTerminalStore((s) => s.fetchLeaderboard);
  const fetchEvents = useTerminalStore((s) => s.fetchEvents);
  const simulatePriceUpdate = useTerminalStore((s) => s.simulatePriceUpdate);
  const markets = useTerminalStore((s) => s.markets);
  const loading = useTerminalStore((s) => s.loading);
  const dataSource = useTerminalStore((s) => s.dataSource);
  const setWatchlist = useTerminalStore((s) => s.setWatchlist);
  const setAlerts = useTerminalStore((s) => s.setAlerts);
  const alerts = useTerminalStore((s) => s.alerts);
  const triggerAlerts = useTerminalStore((s) => s.triggerAlerts);
  const wsConnected = useTerminalStore((s) => s.wsConnected);
  const initialized = useRef(false);

  // Connect to Polymarket WebSocket for real-time prices
  usePolymarketWS();

  // Initialize push notifications when logged in
  useEffect(() => {
    if (!session) return;
    initPushNotifications();
    setupPushListeners();
  }, [session]);

  // Show auth modal on first load if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session && !guestMode) {
      setShowAuth(true);
    }
  }, [status, session, guestMode]);

  // Hydrate watchlist, alerts, and trading data from DB on login
  useEffect(() => {
    if (session) {
      // Authenticated: hydrate from DB
      fetch("/api/watchlist")
        .then((r) => r.json())
        .then((ids: string[]) => { if (Array.isArray(ids)) setWatchlist(ids); })
        .catch(() => {});
      fetch("/api/alerts")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setAlerts(data); })
        .catch(() => {});
      fetchCredentialStatuses();
      fetchOrders();
      fetchPositions();
      fetchPortfolio();
      fetchIndexes();
      fetchLeaderboard();
    } else if (guestMode) {
      // Guest mode: hydrate from localStorage
      try {
        const savedWatchlist = localStorage.getItem("guest_watchlist");
        if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
      } catch {}
      try {
        const savedAlerts = localStorage.getItem("guest_alerts");
        if (savedAlerts) setAlerts(JSON.parse(savedAlerts));
      } catch {}
    }
  }, [session, guestMode, setWatchlist, setAlerts, fetchCredentialStatuses, fetchOrders, fetchPositions, fetchPortfolio, fetchIndexes, fetchLeaderboard]);

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

  // Fetch AI track stats on init and poll every 2 minutes
  useEffect(() => {
    if (markets.length === 0) return;
    fetchAITrack();
    const interval = setInterval(() => {
      fetchAITrack();
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [markets.length, fetchAITrack]);

  // Check resolutions every 5 minutes
  useEffect(() => {
    if (markets.length === 0) return;
    const interval = setInterval(() => {
      checkResolutions();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [markets.length, checkResolutions]);

  // Fetch smart money signals on init and poll every 10 minutes
  useEffect(() => {
    if (markets.length === 0) return;
    fetchSmartMoney();
    const interval = setInterval(() => {
      fetchSmartMoney();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [markets.length, fetchSmartMoney]);

  // Fetch calendar events on init
  useEffect(() => {
    if (markets.length === 0) return;
    fetchEvents();
  }, [markets.length, fetchEvents]);

  // Check alerts callback
  const runAlertCheck = useCallback(() => {
    if (alerts.length === 0 || markets.length === 0) return;
    const triggered = checkAlerts(markets, alerts);
    if (triggered.length > 0) {
      triggerAlerts(triggered.map((a) => a.id));
    }
  }, [markets, alerts, triggerAlerts]);

  // Subtle simulated drift every 2 seconds + alert check
  // When WS is connected, skip drift on Polymarket markets (they get real-time data)
  useEffect(() => {
    if (markets.length === 0) return;
    const interval = setInterval(() => {
      simulatePriceUpdate(wsConnected ? true : undefined);
      runAlertCheck();
    }, 2000);
    return () => clearInterval(interval);
  }, [markets.length, simulatePriceUpdate, runAlertCheck, wsConnected]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-terminal-bg text-terminal-amber font-mono gap-2">
        <div className="text-2xl font-bold">PREDICT</div>
        <div className="text-sm text-terminal-muted">
          Loading markets...
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
