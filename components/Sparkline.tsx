"use client";

import React from "react";
import { generateSparklinePoints } from "@/lib/sparkline";

interface SparklineProps {
  marketId: string;
  probability: number;
  change24h: number;
}

const SparklineInner = ({ marketId, probability, change24h }: SparklineProps) => {
  const points = generateSparklinePoints(marketId, probability, change24h);
  const width = 60;
  const height = 20;
  const padding = 1;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, i) => {
    const x = padding + (i / (points.length - 1)) * (width - 2 * padding);
    const y = padding + (1 - (val - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const color = change24h >= 0 ? "#22c55e" : "#ef4444"; // terminal-green / terminal-red

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Sparkline = React.memo(SparklineInner, (prev, next) =>
  prev.marketId === next.marketId && prev.change24h === next.change24h
);

export default Sparkline;
