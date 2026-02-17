import { Metadata } from "next";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ title?: string; prob?: string; change?: string; source?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const sp = await searchParams;
  const title = sp.title || `Market ${id}`;
  const probability = sp.prob || "50";
  const change24h = sp.change || "0";
  const source = sp.source || "unknown";

  const ogUrl = `/api/og?title=${encodeURIComponent(title)}&probability=${probability}&change24h=${change24h}&source=${source}`;

  return {
    title: `${title} | PREDICT Terminal`,
    description: `${title} — currently at ${probability}¢ on ${source}`,
    openGraph: {
      title: `${title} | PREDICT Terminal`,
      description: `Currently at ${probability}¢ (${parseFloat(change24h) >= 0 ? "+" : ""}${change24h} 24h)`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | PREDICT Terminal`,
      description: `Currently at ${probability}¢`,
      images: [ogUrl],
    },
  };
}

export default async function MarketSharePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  // Client-side redirect will happen; provide a simple fallback
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="refresh" content={`0;url=/?market=${id}`} />
      </head>
      <body style={{ backgroundColor: "#0a0a0a", color: "#ffaa00", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>PREDICT TERMINAL</h1>
          <p style={{ color: "#888" }}>Redirecting to market...</p>
          <p style={{ color: "#e0e0e0", fontSize: 18 }}>{sp.title || id}</p>
        </div>
      </body>
    </html>
  );
}
