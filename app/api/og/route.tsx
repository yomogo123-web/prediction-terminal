import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "Prediction Market";
  const probability = searchParams.get("probability") || "50";
  const change24h = searchParams.get("change24h") || "0";
  const source = searchParams.get("source") || "unknown";

  const prob = parseFloat(probability);
  const change = parseFloat(change24h);
  const isUp = change >= 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          backgroundColor: "#0a0a0a",
          fontFamily: "monospace",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ color: "#ffaa00", fontSize: 32, fontWeight: 700, letterSpacing: "0.1em" }}>
            PREDICT TERMINAL
          </div>
          <div
            style={{
              color: "#666",
              fontSize: 20,
              textTransform: "uppercase",
              border: "1px solid #333",
              padding: "4px 12px",
            }}
          >
            {source}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            color: "#e0e0e0",
            fontSize: title.length > 60 ? 36 : 44,
            fontWeight: 700,
            lineHeight: 1.3,
            maxHeight: "160px",
            overflow: "hidden",
          }}
        >
          {title}
        </div>

        {/* Probability */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "20px" }}>
          <div
            style={{
              fontSize: 120,
              fontWeight: 700,
              color: isUp ? "#00ff88" : "#ff4444",
              lineHeight: 1,
            }}
          >
            {prob.toFixed(1)}
            <span style={{ fontSize: 48 }}>¢</span>
          </div>
          <div
            style={{
              fontSize: 36,
              color: isUp ? "#00ff88" : "#ff4444",
            }}
          >
            {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(1)} (24h)
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #222",
            paddingTop: "20px",
          }}
        >
          <div style={{ color: "#666", fontSize: 18 }}>
            predict.terminal
          </div>
          <div style={{ color: "#ffaa00", fontSize: 18 }}>
            Real-time prediction markets
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
