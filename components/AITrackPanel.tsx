"use client";

import { useTerminalStore } from "@/lib/store";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function brierColor(score: number | null): string {
  if (score === null) return "text-terminal-muted";
  if (score < 0.15) return "text-terminal-green";
  if (score < 0.3) return "text-terminal-amber";
  return "text-terminal-red";
}

export default function AITrackPanel() {
  const stats = useTerminalStore((s) => s.aiTrackStats);
  const loading = useTerminalStore((s) => s.aiTrackLoading);

  if (loading && !stats) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center px-3 py-1.5 border-b border-terminal-border">
          <span className="text-terminal-muted text-[9px] uppercase tracking-wider">
            AI Prediction Tracker
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono">
          Loading...
        </div>
      </div>
    );
  }

  if (!stats || (stats.totalPredictions === 0)) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center px-3 py-1.5 border-b border-terminal-border">
          <span className="text-terminal-muted text-[9px] uppercase tracking-wider">
            AI Prediction Tracker
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono px-4 text-center">
          No predictions tracked yet. Predictions are logged every 15 minutes.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-[9px] uppercase tracking-wider">
          AI Prediction Tracker
        </span>
        <span className="text-terminal-amber text-[9px] font-bold">
          {stats.totalResolved} GRADED
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Stats Row */}
        <div className="flex gap-2 px-3 py-2 border-b border-terminal-border/30">
          <div className="flex-1 bg-terminal-bg px-2 py-1.5 border border-terminal-border/30">
            <div className="text-[9px] text-terminal-muted uppercase">Brier</div>
            <div className={`text-sm font-bold tabular-nums ${brierColor(stats.avgBrierScore)}`}>
              {stats.avgBrierScore !== null ? stats.avgBrierScore.toFixed(4) : "---"}
            </div>
          </div>
          <div className="flex-1 bg-terminal-bg px-2 py-1.5 border border-terminal-border/30">
            <div className="text-[9px] text-terminal-muted uppercase">Hit Rate</div>
            <div className={`text-sm font-bold tabular-nums ${
              stats.hitRate !== null && stats.hitRate >= 50 ? "text-terminal-green" : "text-terminal-red"
            }`}>
              {stats.hitRate !== null ? `${stats.hitRate}%` : "---"}
            </div>
          </div>
          <div className="flex-1 bg-terminal-bg px-2 py-1.5 border border-terminal-border/30">
            <div className="text-[9px] text-terminal-muted uppercase">Tracked</div>
            <div className="text-sm font-bold tabular-nums text-terminal-text">
              {stats.totalPredictions}
            </div>
          </div>
        </div>

        {/* Calibration */}
        {stats.calibration.length > 0 && (
          <div className="px-3 py-2 border-b border-terminal-border/30">
            <div className="text-[9px] text-terminal-muted uppercase mb-1">Calibration</div>
            {stats.calibration.map((bucket) => {
              const maxWidth = 100;
              const pWidth = Math.min(bucket.avgPredicted, maxWidth);
              const aWidth = Math.min(bucket.avgActual, maxWidth);
              return (
                <div key={bucket.range} className="flex items-center gap-1 text-[10px] font-mono mb-0.5">
                  <span className="w-12 text-terminal-muted text-right">{bucket.range}</span>
                  <div className="flex-1 flex items-center gap-0.5">
                    <div
                      className="h-2 bg-terminal-amber/60"
                      style={{ width: `${pWidth}%` }}
                    />
                  </div>
                  <span className="w-8 text-terminal-amber tabular-nums">P:{bucket.avgPredicted.toFixed(0)}</span>
                  <span className="w-8 text-terminal-green tabular-nums">A:{bucket.avgActual.toFixed(0)}</span>
                  <span className="w-6 text-terminal-muted tabular-nums">n={bucket.count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Resolved */}
        {stats.recentResolved.length > 0 && (
          <div className="px-3 py-2 border-b border-terminal-border/30">
            <div className="text-[9px] text-terminal-muted uppercase mb-1">Recent Resolved</div>
            {stats.recentResolved.map((r, i) => {
              const correct =
                (r.aiProbability > 50 && r.resolution === "yes") ||
                (r.aiProbability < 50 && r.resolution === "no");
              return (
                <div key={r.id} className="mb-1.5">
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    <span className="text-terminal-amber font-bold">#{i + 1}</span>
                    <span className="truncate flex-1 text-terminal-text">
                      {r.marketTitle.slice(0, 40)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono ml-4">
                    <span className="text-terminal-muted">AI:</span>
                    <span className="text-terminal-amber tabular-nums">{r.aiProbability.toFixed(1)}%</span>
                    <span className="text-terminal-muted">MKT:</span>
                    <span className="tabular-nums">{r.marketProbability.toFixed(1)}%</span>
                    <span className="text-terminal-muted">=&gt;</span>
                    <span className={correct ? "text-terminal-green font-bold" : "text-terminal-red font-bold"}>
                      {r.resolution.toUpperCase()}
                    </span>
                    <span className={`tabular-nums ${brierColor(r.brierScore)}`}>
                      {r.brierScore !== null ? r.brierScore.toFixed(3) : ""}
                    </span>
                    <span className="text-terminal-muted ml-auto">{timeAgo(r.resolvedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pending Predictions */}
        {stats.pendingPredictions.length > 0 && (
          <div className="px-3 py-2">
            <div className="text-[9px] text-terminal-muted uppercase mb-1">
              Pending ({stats.totalPredictions - stats.totalResolved})
            </div>
            {stats.pendingPredictions.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1 text-[10px] font-mono mb-0.5"
              >
                <span className="truncate flex-1 text-terminal-text">
                  {p.marketTitle.slice(0, 35)}
                </span>
                <span className="text-terminal-amber tabular-nums">
                  AI:{p.aiProbability.toFixed(0)}%
                </span>
                <span className="text-terminal-muted">vs</span>
                <span className="tabular-nums">
                  MKT:{p.marketProbability.toFixed(0)}%
                </span>
                <span className={`tabular-nums font-bold ${
                  p.divergence > 0 ? "text-terminal-green" : "text-terminal-red"
                }`}>
                  {p.divergence > 0 ? "+" : ""}{p.divergence.toFixed(0)}
                </span>
                <span className={`text-[9px] uppercase ${
                  p.confidence === "high"
                    ? "text-terminal-green"
                    : p.confidence === "medium"
                      ? "text-terminal-amber"
                      : "text-terminal-muted"
                }`}>
                  {p.confidence.slice(0, 3).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
