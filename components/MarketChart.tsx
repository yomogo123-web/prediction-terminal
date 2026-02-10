"use client";

import { useSelectedMarket, useTerminalStore } from "@/lib/store";
import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, AreaSeries } from "lightweight-charts";

export default function MarketChart() {
  const selectedMarket = useSelectedMarket();
  const loadMarketHistory = useTerminalStore((s) => s.loadMarketHistory);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  // Create chart on mount
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#111111" },
        textColor: "#666666",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1a1a1a" },
        horzLines: { color: "#1a1a1a" },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: "#ffaa00",
          width: 1,
          style: 2,
          labelBackgroundColor: "#ffaa00",
        },
        horzLine: {
          color: "#ffaa00",
          width: 1,
          style: 2,
          labelBackgroundColor: "#ffaa00",
        },
      },
      rightPriceScale: {
        borderColor: "#222222",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#222222",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#00ff88",
      topColor: "rgba(0, 255, 136, 0.3)",
      bottomColor: "rgba(0, 255, 136, 0.02)",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => price.toFixed(1) + "%",
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Fetch price history when selected market changes
  useEffect(() => {
    if (selectedMarket?.id) {
      loadMarketHistory(selectedMarket.id);
    }
  }, [selectedMarket?.id, loadMarketHistory]);

  // Update chart data when selected market or its history changes
  useEffect(() => {
    if (!seriesRef.current || !selectedMarket) return;

    if (selectedMarket.priceHistory.length === 0) {
      seriesRef.current.setData([]);
      return;
    }

    const data = selectedMarket.priceHistory.map((p) => ({
      time: p.time as import("lightweight-charts").UTCTimestamp,
      value: p.probability,
    }));

    seriesRef.current.setData(data);

    // Color line based on 24h change
    const color =
      selectedMarket.change24h >= 0 ? "#00ff88" : "#ff4444";
    seriesRef.current.applyOptions({
      lineColor: color,
      topColor:
        selectedMarket.change24h >= 0
          ? "rgba(0, 255, 136, 0.3)"
          : "rgba(255, 68, 68, 0.3)",
      bottomColor:
        selectedMarket.change24h >= 0
          ? "rgba(0, 255, 136, 0.02)"
          : "rgba(255, 68, 68, 0.02)",
    });

    chartRef.current?.timeScale().fitContent();
  }, [selectedMarket?.id, selectedMarket?.priceHistory.length, selectedMarket?.change24h]);

  if (!selectedMarket) {
    return (
      <div className="h-full flex items-center justify-center text-terminal-muted text-sm font-mono">
        Select a market to view chart
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-xs font-mono">
          PROBABILITY CHART
          {selectedMarket.priceHistory.length === 0 && selectedMarket.clobTokenId
            ? " (loading...)"
            : ""}
        </span>
        <span className="text-terminal-text text-xs font-mono truncate ml-2">
          {selectedMarket.title}
        </span>
      </div>
      <div ref={chartContainerRef} className="flex-1" />
    </div>
  );
}
