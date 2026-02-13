"use client";

import { useMarketAnalytics, useTerminalStore, useEdgeSignals } from "@/lib/store";
import CorrelationMatrix from "./CorrelationMatrix";
import { formatVolume } from "@/lib/format";

function asciiBar(ratio: number, width: number): string {
  const filled = Math.round(ratio * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

const SOURCE_LABELS: Record<string, string> = {
  polymarket: "POLY",
  kalshi: "KLSH",
  manifold: "MNFD",
  predictit: "PDIT",
  mock: "MOCK",
};

export default function AnalyticsPanel() {
  const analytics = useMarketAnalytics();
  const edgeSignals = useEdgeSignals();
  const markets = useTerminalStore((s) => s.markets);
  const selectMarket = useTerminalStore((s) => s.selectMarket);

  const maxCatVol = Math.max(...analytics.volumeByCategory.map((c) => c.volume), 1);
  const maxBucketCount = Math.max(...analytics.probabilityDistribution.map((b) => b.count), 1);
  const maxVolatility = Math.max(...analytics.volatilityByCategory.map((v) => v.stdDev), 0.01);

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 p-2">
        <div className="bg-terminal-bg px-2 py-1.5 text-center">
          <div className="text-terminal-muted text-[9px] uppercase tracking-wider">Volume</div>
          <div className="text-terminal-green text-xs font-bold tabular-nums">
            {formatVolume(analytics.totalVolume)}
          </div>
        </div>
        <div className="bg-terminal-bg px-2 py-1.5 text-center">
          <div className="text-terminal-muted text-[9px] uppercase tracking-wider">Markets</div>
          <div className="text-terminal-amber text-xs font-bold tabular-nums">
            {analytics.marketCount}
          </div>
        </div>
        <div className="bg-terminal-bg px-2 py-1.5 text-center">
          <div className="text-terminal-muted text-[9px] uppercase tracking-wider">Avg Prob</div>
          <div className="text-terminal-text text-xs font-bold tabular-nums">
            {analytics.avgProbability.toFixed(1)}¢
          </div>
        </div>
        <div className="bg-terminal-bg px-2 py-1.5 text-center">
          <div className="text-terminal-muted text-[9px] uppercase tracking-wider">Sources</div>
          <div className="text-terminal-amber text-xs font-bold tabular-nums">
            {analytics.activeSources}
          </div>
        </div>
      </div>

      {/* Volume by Category */}
      <div className="px-2 pt-1 pb-2">
        <div className="text-terminal-muted text-[9px] uppercase tracking-wider mb-1">
          Volume by Category
        </div>
        {analytics.volumeByCategory.map((cat) => (
          <div key={cat.category} className="flex items-center gap-1 text-[10px] font-mono leading-relaxed">
            <span className="text-terminal-muted w-[52px] truncate flex-shrink-0">
              {cat.category}
            </span>
            <span className="text-terminal-amber flex-shrink-0 w-[88px] overflow-hidden">
              {asciiBar(cat.volume / maxCatVol, 10)}
            </span>
            <span className="text-terminal-text tabular-nums flex-shrink-0 w-[44px] text-right">
              {formatVolume(cat.volume)}
            </span>
            <span className="text-terminal-muted tabular-nums flex-shrink-0 w-[20px] text-right">
              {cat.count}
            </span>
            <span
              className={`tabular-nums flex-shrink-0 w-[38px] text-right ${
                cat.avgChange >= 0 ? "text-terminal-green" : "text-terminal-red"
              }`}
            >
              {cat.avgChange >= 0 ? "+" : ""}
              {cat.avgChange.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Source Comparison */}
      {analytics.volumeBySource.length > 0 && (
        <div className="px-2 pb-2">
          <div className="text-terminal-muted text-[9px] uppercase tracking-wider mb-1">
            Source Comparison
          </div>
          {analytics.volumeBySource.map((src) => (
            <div key={src.source} className="flex items-center gap-1 text-[10px] font-mono leading-relaxed">
              <span className="text-terminal-amber w-[32px] flex-shrink-0">
                {SOURCE_LABELS[src.source] || src.source}
              </span>
              <span className="text-terminal-text tabular-nums flex-shrink-0 w-[50px] text-right">
                {formatVolume(src.volume)}
              </span>
              <span className="text-terminal-muted tabular-nums flex-shrink-0 w-[28px] text-right">
                {src.count}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Probability Distribution */}
      <div className="px-2 pb-2">
        <div className="text-terminal-muted text-[9px] uppercase tracking-wider mb-1">
          Probability Distribution
        </div>
        {analytics.probabilityDistribution.map((bucket) => (
          <div key={bucket.label} className="flex items-center gap-1 text-[10px] font-mono leading-relaxed">
            <span className="text-terminal-muted w-[34px] flex-shrink-0 text-right">
              {bucket.label}
            </span>
            <span className="text-terminal-green flex-shrink-0 w-[112px] overflow-hidden">
              {asciiBar(bucket.count / maxBucketCount, 14)}
            </span>
            <span className="text-terminal-text tabular-nums flex-shrink-0 w-[20px] text-right">
              {bucket.count}
            </span>
          </div>
        ))}
      </div>

      {/* Hot Markets */}
      <div className="px-2 pb-2">
        <div className="text-terminal-muted text-[9px] uppercase tracking-wider mb-1">
          Hot Markets
        </div>
        {analytics.hotMarkets.map(({ market, score }, i) => (
          <div
            key={market.id}
            onClick={() => selectMarket(market.id)}
            className="flex items-center gap-1 text-[10px] font-mono leading-relaxed cursor-pointer hover:bg-terminal-panel/80 px-1 -mx-1 rounded"
          >
            <span className="text-terminal-muted w-[10px] flex-shrink-0">{i + 1}</span>
            <span className="text-terminal-text truncate flex-1 min-w-0">
              {market.title}
            </span>
            <span
              className={`tabular-nums flex-shrink-0 w-[38px] text-right ${
                market.change24h >= 0 ? "text-terminal-green" : "text-terminal-red"
              }`}
            >
              {market.change24h >= 0 ? "+" : ""}
              {market.change24h.toFixed(1)}
            </span>
            <span className="text-terminal-muted tabular-nums flex-shrink-0 w-[38px] text-right">
              {score.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Market Sentiment Gauge */}
      <div className="px-2 pb-2">
        <div className="text-terminal-muted text-[9px] uppercase tracking-wider mb-1">
          Market Sentiment
        </div>
        <div className="text-[10px] font-mono leading-relaxed">
          <div className="flex items-center gap-1">
            <span className="text-terminal-red flex-shrink-0">BEAR</span>
            <span className="flex-shrink-0">
              <span className="text-terminal-red">{"◄"}</span>
              <span className="text-terminal-red">
                {"█".repeat(Math.round((analytics.sentiment.bearRatio / 100) * 16))}
              </span>
              <span className="text-terminal-green">
                {"█".repeat(Math.round((analytics.sentiment.bullRatio / 100) * 16))}
              </span>
              <span className="text-terminal-green">{"►"}</span>
            </span>
            <span className="text-terminal-green flex-shrink-0">BULL</span>
            <span className="text-terminal-text tabular-nums flex-shrink-0 ml-auto">
              {analytics.sentiment.bullRatio.toFixed(0)}%
            </span>
          </div>
          <div className="flex gap-2 text-terminal-muted mt-0.5">
            <span>
              <span className="text-terminal-green">{analytics.sentiment.bullCount}</span> bull
            </span>
            <span>
              <span className="text-terminal-red">{analytics.sentiment.bearCount}</span> bear
            </span>
            <span>
              <span className="text-terminal-text">{analytics.sentiment.neutralCount}</span> neutral
            </span>
          </div>
        </div>
      </div>

      {/* Volatility by Category */}
      <div className="px-2 pb-2">
        <div className="text-terminal-muted text-[9px] uppercase tracking-wider mb-1">
          Volatility by Category
        </div>
        {analytics.volatilityByCategory.map((vol, i) => (
          <div key={vol.category} className="flex items-center gap-1 text-[10px] font-mono leading-relaxed">
            <span className={`w-[52px] truncate flex-shrink-0 ${i === 0 ? "text-terminal-amber" : "text-terminal-muted"}`}>
              {vol.category}
            </span>
            <span className={`flex-shrink-0 w-[88px] overflow-hidden ${i === 0 ? "text-terminal-amber" : "text-terminal-text"}`}>
              {asciiBar(vol.stdDev / maxVolatility, 10)}
            </span>
            <span className="text-terminal-text tabular-nums flex-shrink-0 w-[34px] text-right">
              {vol.stdDev.toFixed(1)}
            </span>
            <span className="text-terminal-muted tabular-nums flex-shrink-0 w-[38px] text-right">
              max {vol.maxAbsMove.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {/* VWAP Analysis */}
      <div className="px-2 pb-2">
        <div className="text-terminal-muted text-[9px] uppercase tracking-wider mb-1">
          VWAP Analysis
        </div>
        <div className="text-[10px] font-mono leading-relaxed">
          <div className="flex items-center gap-1">
            <span className="text-terminal-muted">VWAP</span>
            <span className="text-terminal-text tabular-nums">{analytics.vwap.overall.vwap.toFixed(1)}¢</span>
            <span className="text-terminal-muted">vs AVG</span>
            <span className="text-terminal-text tabular-nums">{analytics.vwap.overall.avg.toFixed(1)}¢</span>
            <span className="text-terminal-muted">{"\u2192"}</span>
            <span className={`tabular-nums ${analytics.vwap.overall.skew >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
              {analytics.vwap.overall.skew >= 0 ? "+" : ""}{analytics.vwap.overall.skew.toFixed(1)}¢ SKEW
            </span>
          </div>
          <div className="text-terminal-muted mt-0.5">
            {analytics.vwap.overall.skew > 2 ? "Big money tilts BULLISH" : analytics.vwap.overall.skew < -2 ? "Big money tilts BEARISH" : "Volume-neutral positioning"}
          </div>
          {analytics.vwap.bySource.length > 1 && (
            <div className="mt-1">
              {analytics.vwap.bySource.map((s) => (
                <div key={s.source} className="flex items-center gap-1">
                  <span className="text-terminal-amber w-[32px] flex-shrink-0">
                    {SOURCE_LABELS[s.source] || s.source}
                  </span>
                  <span className="text-terminal-text tabular-nums w-[42px] text-right">
                    {s.vwap.toFixed(1)}¢
                  </span>
                  <span className="text-terminal-muted tabular-nums w-[24px] text-right">
                    ({s.count})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Volume Concentration */}
      <div className="px-2 pb-2">
        <div className="text-terminal-muted text-[9px] uppercase tracking-wider mb-1">
          Volume Concentration
        </div>
        <div className="text-[10px] font-mono leading-relaxed">
          <div className="flex items-center gap-2">
            <span className="text-terminal-muted">HHI</span>
            <span className="text-terminal-text tabular-nums">{analytics.concentration.hhi.toFixed(0)}</span>
            <span className={
              analytics.concentration.label === "LOW" ? "text-terminal-green" :
              analytics.concentration.label === "MODERATE" ? "text-terminal-amber" :
              "text-terminal-red"
            }>
              {analytics.concentration.label}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-terminal-muted">Top 5 share:</span>
            <span className="text-terminal-amber flex-shrink-0 w-[88px] overflow-hidden">
              {asciiBar(analytics.concentration.top5SharePct / 100, 10)}
            </span>
            <span className="text-terminal-text tabular-nums">
              {analytics.concentration.top5SharePct.toFixed(1)}%
            </span>
          </div>
          <div className="mt-0.5">
            {analytics.concentration.top5Markets.map((m, i) => (
              <div key={i} className="flex items-center gap-1 text-terminal-muted">
                <span className="w-[10px] flex-shrink-0">{i + 1}</span>
                <span className="truncate flex-1 min-w-0 text-terminal-text">{m.title}</span>
                <span className="tabular-nums flex-shrink-0 w-[38px] text-right">{m.sharePct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mispricing Signals */}
      <div className="px-2 pb-2">
        <div className="text-terminal-muted text-[9px] uppercase tracking-wider mb-1">
          Mispricing Signals
        </div>
        <div className="text-[10px] font-mono leading-relaxed">
          {analytics.mispricingSignals.filter((s) => s.type === "overconfidence").length > 0 && (
            <div className="mb-1">
              <div className="text-terminal-red text-[9px] uppercase mb-0.5">Overconfidence</div>
              {analytics.mispricingSignals
                .filter((s) => s.type === "overconfidence")
                .slice(0, 3)
                .map((sig) => (
                  <div
                    key={sig.market.id}
                    onClick={() => selectMarket(sig.market.id)}
                    className="flex items-center gap-1 cursor-pointer hover:bg-terminal-panel/80 px-1 -mx-1 rounded"
                  >
                    <span className="text-terminal-text truncate flex-1 min-w-0">{sig.market.title}</span>
                    <span className="text-terminal-amber tabular-nums flex-shrink-0 w-[28px] text-right">
                      {sig.market.probability.toFixed(0)}¢
                    </span>
                    <span className="text-terminal-muted tabular-nums flex-shrink-0 w-[38px] text-right">
                      {formatVolume(sig.market.volume)}
                    </span>
                  </div>
                ))}
            </div>
          )}
          {analytics.mispricingSignals.filter((s) => s.type === "opportunity").length > 0 && (
            <div>
              <div className="text-terminal-green text-[9px] uppercase mb-0.5">Opportunity</div>
              {analytics.mispricingSignals
                .filter((s) => s.type === "opportunity")
                .slice(0, 3)
                .map((sig) => (
                  <div
                    key={sig.market.id}
                    onClick={() => selectMarket(sig.market.id)}
                    className="flex items-center gap-1 cursor-pointer hover:bg-terminal-panel/80 px-1 -mx-1 rounded"
                  >
                    <span className="text-terminal-text truncate flex-1 min-w-0">{sig.market.title}</span>
                    <span className="text-terminal-amber tabular-nums flex-shrink-0 w-[28px] text-right">
                      {sig.market.probability.toFixed(0)}¢
                    </span>
                    <span className="text-terminal-muted tabular-nums flex-shrink-0 w-[38px] text-right">
                      {formatVolume(sig.market.volume)}
                    </span>
                  </div>
                ))}
            </div>
          )}
          {analytics.mispricingSignals.length === 0 && (
            <div className="text-terminal-muted">No signals detected</div>
          )}
        </div>
      </div>

      {/* Edge Detection Summary */}
      <div className="px-2 pb-2">
        <div className="text-terminal-muted text-[9px] uppercase tracking-wider mb-1">
          Edge Detection
        </div>
        <div className="text-[10px] font-mono leading-relaxed">
          {(() => {
            const signals = Array.from(edgeSignals.values());
            const buys = signals.filter((s) => s.edgeScore >= 15).sort((a, b) => b.edgeScore - a.edgeScore);
            const sells = signals.filter((s) => s.edgeScore <= -15).sort((a, b) => a.edgeScore - b.edgeScore);
            return (
              <>
                {buys.length > 0 && (
                  <div className="mb-1">
                    <div className="text-terminal-green text-[9px] uppercase mb-0.5">Top Edges ({buys.length})</div>
                    {buys.slice(0, 3).map((sig) => {
                      const m = markets.find((mk) => mk.id === sig.marketId);
                      if (!m) return null;
                      return (
                        <div
                          key={sig.marketId}
                          onClick={() => selectMarket(sig.marketId)}
                          className="flex items-center gap-1 cursor-pointer hover:bg-terminal-panel/80 px-1 -mx-1 rounded"
                        >
                          <span className="text-terminal-text truncate flex-1 min-w-0">{m.title}</span>
                          <span className="text-terminal-green tabular-nums flex-shrink-0 w-[28px] text-right font-bold">
                            +{sig.edgeScore}
                          </span>
                          <span className="text-terminal-muted tabular-nums flex-shrink-0 w-[32px] text-right">
                            {sig.edgeLabel.split(" ").pop()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {sells.length > 0 && (
                  <div>
                    <div className="text-terminal-red text-[9px] uppercase mb-0.5">Sell Signals ({sells.length})</div>
                    {sells.slice(0, 3).map((sig) => {
                      const m = markets.find((mk) => mk.id === sig.marketId);
                      if (!m) return null;
                      return (
                        <div
                          key={sig.marketId}
                          onClick={() => selectMarket(sig.marketId)}
                          className="flex items-center gap-1 cursor-pointer hover:bg-terminal-panel/80 px-1 -mx-1 rounded"
                        >
                          <span className="text-terminal-text truncate flex-1 min-w-0">{m.title}</span>
                          <span className="text-terminal-red tabular-nums flex-shrink-0 w-[28px] text-right font-bold">
                            {sig.edgeScore}
                          </span>
                          <span className="text-terminal-muted tabular-nums flex-shrink-0 w-[32px] text-right">
                            {sig.edgeLabel.split(" ").pop()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {buys.length === 0 && sells.length === 0 && (
                  <div className="text-terminal-muted">No edge signals detected</div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Category Momentum */}
      <div className="px-2 pb-2">
        <div className="text-terminal-muted text-[9px] uppercase tracking-wider mb-1">
          Category Momentum
        </div>
        {analytics.categoryMomentum.map((mom) => (
          <div key={mom.category} className="flex items-center gap-1 text-[10px] font-mono leading-relaxed">
            <span className="text-terminal-muted w-[52px] truncate flex-shrink-0">
              {mom.category}
            </span>
            <span className="flex-shrink-0 w-[56px]">
              <span className="text-terminal-green">{"▲".repeat(Math.min(mom.upCount, 5))}</span>
              <span className="text-terminal-red">{"▼".repeat(Math.min(mom.downCount, 5))}</span>
            </span>
            <span className={`tabular-nums flex-shrink-0 w-[38px] text-right ${
              mom.upPct >= 50 ? "text-terminal-green" : "text-terminal-red"
            }`}>
              {mom.upPct.toFixed(0)}% UP
            </span>
            <span className={`tabular-nums flex-shrink-0 w-[40px] text-right ${
              mom.netMomentum >= 0 ? "text-terminal-green" : "text-terminal-red"
            }`}>
              {mom.netMomentum >= 0 ? "+" : ""}{mom.netMomentum.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Correlation Matrix */}
      <CorrelationMatrix />
    </div>
  );
}
