import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, formatMarketCard } from "@/lib/telegram";
import { fetchMarkets } from "@/lib/api";
import { fuzzySearch } from "@/lib/fuzzy-search";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const message = body.message;
  if (!message?.text || !message?.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  // Handle /start command (link account)
  if (text.startsWith("/start ")) {
    const token = text.split(" ")[1];
    if (token) {
      await handleLink(chatId, token);
    } else {
      await sendTelegramMessage(chatId, "Welcome to PREDICT Terminal Bot!\n\nCommands:\n/price <query> - Market price\n/top - Top movers\n/portfolio - Your P&L");
    }
    return NextResponse.json({ ok: true });
  }

  if (text === "/start") {
    await sendTelegramMessage(chatId, "Welcome to PREDICT Terminal Bot!\n\nCommands:\n/price <query> - Market price\n/top - Top movers\n/portfolio - Your P&L");
    return NextResponse.json({ ok: true });
  }

  // /price command
  if (text.startsWith("/price ")) {
    const query = text.slice(7).trim();
    await handlePrice(chatId, query);
    return NextResponse.json({ ok: true });
  }

  // /top command
  if (text === "/top") {
    await handleTop(chatId);
    return NextResponse.json({ ok: true });
  }

  // /portfolio command
  if (text === "/portfolio") {
    await handlePortfolio(chatId);
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(chatId, "Unknown command. Try /price, /top, or /portfolio");
  return NextResponse.json({ ok: true });
}

async function handleLink(chatId: string, token: string) {
  try {
    // Find user by link token (stored temporarily)
    const user = await prisma.user.findFirst({
      where: { telegramChatId: `pending:${token}` },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramChatId: chatId,
          telegramLinkedAt: new Date(),
        },
      });
      await sendTelegramMessage(chatId, "Account linked successfully! You'll now receive alert notifications here.");
    } else {
      await sendTelegramMessage(chatId, "Invalid or expired link token. Please generate a new one in PREDICT Terminal settings.");
    }
  } catch {
    await sendTelegramMessage(chatId, "Failed to link account. Please try again.");
  }
}

async function handlePrice(chatId: string, query: string) {
  try {
    const markets = await fetchMarkets();
    const results = fuzzySearch(markets, query);

    if (results.length === 0) {
      await sendTelegramMessage(chatId, `No markets found for "${query}"`);
      return;
    }

    const market = results[0].market;
    await sendTelegramMessage(chatId, formatMarketCard(market));
  } catch {
    await sendTelegramMessage(chatId, "Failed to fetch market data. Try again later.");
  }
}

async function handleTop(chatId: string) {
  try {
    const markets = await fetchMarkets();
    const sorted = markets
      .filter((m) => m.status === "active")
      .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
      .slice(0, 5);

    if (sorted.length === 0) {
      await sendTelegramMessage(chatId, "No active markets found.");
      return;
    }

    const lines = sorted.map((m, i) => {
      const arrow = m.change24h >= 0 ? "▲" : "▼";
      return `${i + 1}. ${m.title.slice(0, 40)}\n   ${m.probability.toFixed(1)}¢ ${arrow}${Math.abs(m.change24h).toFixed(1)}`;
    });

    await sendTelegramMessage(chatId, `<b>Top Movers</b>\n\n${lines.join("\n\n")}`);
  } catch {
    await sendTelegramMessage(chatId, "Failed to fetch data.");
  }
}

async function handlePortfolio(chatId: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { telegramChatId: chatId },
      include: { positions: true },
    });

    if (!user) {
      await sendTelegramMessage(chatId, "No account linked. Link your account in PREDICT Terminal settings.");
      return;
    }

    if (user.positions.length === 0) {
      await sendTelegramMessage(chatId, "No open positions.");
      return;
    }

    let totalPnl = 0;
    const lines = user.positions.map((p) => {
      const unrealized = p.shares * (p.currentPrice - p.avgCostBasis);
      totalPnl += unrealized + p.realizedPnl;
      const sign = unrealized >= 0 ? "+" : "";
      return `${p.side.toUpperCase()} ${p.marketId.slice(0, 20)} → ${sign}$${unrealized.toFixed(2)}`;
    });

    const totalSign = totalPnl >= 0 ? "+" : "";
    await sendTelegramMessage(
      chatId,
      `<b>Portfolio</b>\n\n${lines.join("\n")}\n\n<b>Total P&L: ${totalSign}$${totalPnl.toFixed(2)}</b>`
    );
  } catch {
    await sendTelegramMessage(chatId, "Failed to fetch portfolio.");
  }
}
