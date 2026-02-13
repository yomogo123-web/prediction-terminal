"use client";

import { useState } from "react";
import { useTerminalStore } from "@/lib/store";

function getCorrelationColor(value: number): string {
  if (value >= 0.7) return "bg-green-600/60 text-green-200";
  if (value >= 0.3) return "bg-green-600/30 text-green-300";
  if (value >= 0.1) return "bg-green-600/10 text-terminal-text";
  if (value >= -0.1) return "bg-transparent text-terminal-muted";
  if (value >= -0.3) return "bg-red-600/10 text-terminal-text";
  if (value >= -0.7) return "bg-red-600/30 text-red-300";
  return "bg-red-600/60 text-red-200";
}

export default function CorrelationMatrix() {
  const cachedCategoryCorrelation = useTerminalStore((s) => s.cachedCategoryCorrelation);
  const cachedMarketCorrelation = useTerminalStore((s) => s.cachedMarketCorrelation);
  const [mode, setMode] = useState<"category" | "market">("category");

  const matrix = mode === "category" ? cachedCategoryCorrelation : cachedMarketCorrelation;

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center justify-between mb-1">
        <div className="text-terminal-muted text-[9px] uppercase tracking-wider">
          Correlation Matrix
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setMode("category")}
            className={`text-[9px] px-1.5 py-0.5 ${
              mode === "category"
                ? "text-terminal-amber border-b border-terminal-amber"
                : "text-terminal-muted hover:text-terminal-text"
            }`}
          >
            CAT
          </button>
          <button
            onClick={() => setMode("market")}
            className={`text-[9px] px-1.5 py-0.5 ${
              mode === "market"
                ? "text-terminal-amber border-b border-terminal-amber"
                : "text-terminal-muted hover:text-terminal-text"
            }`}
          >
            MKT
          </button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="text-[9px] font-mono border-collapse w-full">
          <thead>
            <tr>
              <th className="text-terminal-muted text-left px-0.5 py-0.5 w-12"></th>
              {matrix.labels.map((label) => (
                <th
                  key={label}
                  className="text-terminal-muted text-center px-0.5 py-0.5 font-normal"
                  style={{ minWidth: mode === "category" ? "36px" : "28px" }}
                >
                  {label.slice(0, 5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.values.map((row, i) => (
              <tr key={matrix.labels[i]}>
                <td className="text-terminal-muted px-0.5 py-0.5 truncate max-w-[48px]">
                  {matrix.labels[i].slice(0, 5)}
                </td>
                {row.map((value, j) => (
                  <td
                    key={j}
                    className={`text-center px-0.5 py-0.5 tabular-nums ${getCorrelationColor(value)}`}
                  >
                    {value.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
