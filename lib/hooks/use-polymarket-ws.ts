"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTerminalStore } from "@/lib/store";
import { PolymarketWS } from "@/lib/polymarket-ws";

/**
 * Bridges the Polymarket WebSocket class to the Zustand store.
 * Connects when dataSource is "live" and Polymarket markets exist,
 * re-subscribes when the market list changes, and cleans up on unmount.
 */
export function usePolymarketWS(): void {
  const markets = useTerminalStore((s) => s.markets);
  const dataSource = useTerminalStore((s) => s.dataSource);
  const updateMarketPrices = useTerminalStore((s) => s.updateMarketPrices);
  const setWsConnected = useTerminalStore((s) => s.setWsConnected);

  const wsRef = useRef<PolymarketWS | null>(null);
  const assetToMarketRef = useRef<Map<string, string>>(new Map());

  // Build lookup: assetId → marketId for Polymarket markets with clobTokenId
  const polymarketEntries = markets
    .filter((m) => m.source === "polymarket" && m.clobTokenId)
    .map((m) => ({ assetId: m.clobTokenId!, marketId: m.id }));

  const assetIds = polymarketEntries.map((e) => e.assetId);
  // Stable key for detecting market list changes
  const assetIdsKey = assetIds.slice().sort().join(",");

  const handlePriceUpdate = useCallback(
    (updates: Map<string, number>) => {
      const lookup = assetToMarketRef.current;
      const marketUpdates = new Map<string, number>();
      updates.forEach((price, assetId) => {
        const marketId = lookup.get(assetId);
        if (marketId) {
          marketUpdates.set(marketId, price);
        }
      });
      if (marketUpdates.size > 0) {
        updateMarketPrices(marketUpdates);
      }
    },
    [updateMarketPrices]
  );

  const handleConnectionChange = useCallback(
    (connected: boolean) => {
      setWsConnected(connected);
    },
    [setWsConnected]
  );

  // Main effect: connect / re-subscribe / disconnect
  useEffect(() => {
    if (dataSource !== "live" || assetIds.length === 0) {
      // No Polymarket markets or not live — disconnect if running
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      return;
    }

    // Update lookup map
    const lookup = new Map<string, string>();
    polymarketEntries.forEach((e) => lookup.set(e.assetId, e.marketId));
    assetToMarketRef.current = lookup;

    if (!wsRef.current) {
      // First connection
      const ws = new PolymarketWS({
        onPriceUpdate: handlePriceUpdate,
        onConnectionChange: handleConnectionChange,
      });
      wsRef.current = ws;
      ws.connect(assetIds);
    } else {
      // Market list changed — update subscription delta
      wsRef.current.updateSubscription(assetIds);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource, assetIdsKey, handlePriceUpdate, handleConnectionChange]);
}
