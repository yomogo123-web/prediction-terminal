import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PREDICT Terminal",
  description: "Bloomberg-style prediction markets terminal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
