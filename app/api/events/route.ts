import { NextResponse } from "next/server";
import { getUpcomingEvents } from "@/lib/events-data";

export const dynamic = "force-dynamic";
import { CalendarEvent } from "@/lib/event-types";
import { fetchMarkets } from "@/lib/api";

export async function GET() {
  const upcomingStatic = getUpcomingEvents(90);
  const now = new Date();

  let markets: { id: string; title: string }[] = [];
  try {
    const allMarkets = await fetchMarkets();
    markets = allMarkets.map((m) => ({ id: m.id, title: m.title.toLowerCase() }));
  } catch {
    // Fall back to no market matching
  }

  const events: CalendarEvent[] = upcomingStatic.map((event) => {
    const eventDate = new Date(event.date);
    const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Find relevant markets by keyword matching
    const relevantMarketIds: string[] = [];
    for (const market of markets) {
      const matches = event.keywords.some((kw) => market.title.includes(kw));
      if (matches) {
        relevantMarketIds.push(market.id);
      }
    }

    return {
      id: `event-${event.date}-${event.title.replace(/\s+/g, "-").toLowerCase()}`,
      title: event.title,
      date: event.date,
      category: event.category,
      daysUntil,
      relevantMarketIds: relevantMarketIds.slice(0, 5),
    };
  });

  return NextResponse.json(events);
}
