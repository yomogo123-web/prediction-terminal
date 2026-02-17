const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<boolean> {
  if (!BOT_TOKEN) return false;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export function formatMarketCard(market: {
  title: string;
  probability: number;
  change24h: number;
  source: string;
  volume: number;
}): string {
  const arrow = market.change24h >= 0 ? "▲" : "▼";
  const change = Math.abs(market.change24h).toFixed(1);

  return [
    `<b>${escapeHtml(market.title)}</b>`,
    ``,
    `Price: <b>${market.probability.toFixed(1)}¢</b> ${arrow}${change} (24h)`,
    `Source: ${market.source.toUpperCase()}`,
    `Volume: $${formatVol(market.volume)}`,
  ].join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}
