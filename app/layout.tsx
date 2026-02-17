import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "PREDICT Terminal",
  description: "Real-time prediction markets tracker — prices, charts, and trading across Polymarket, Kalshi, PredictIt, and Manifold.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://predicterminal.vercel.app"),
  openGraph: {
    title: "PREDICT Terminal",
    description: "Real-time prediction markets terminal — prices, charts, trading, AI edge, and arbitrage detection.",
    images: ["/api/og?title=PREDICT%20Terminal&probability=50&source=multi"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PREDICT Terminal",
    description: "Real-time prediction markets terminal",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="icon" href="/icons/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
