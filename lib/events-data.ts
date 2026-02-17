interface StaticEvent {
  title: string;
  date: string;
  category: string;
  keywords: string[];
}

// Static event calendar — update annually
export const STATIC_EVENTS: StaticEvent[] = [
  // FOMC Meetings 2025-2026
  { title: "FOMC Meeting", date: "2025-06-18", category: "Crypto", keywords: ["fed", "fomc", "interest rate", "monetary policy"] },
  { title: "FOMC Meeting", date: "2025-07-30", category: "Crypto", keywords: ["fed", "fomc", "interest rate", "monetary policy"] },
  { title: "FOMC Meeting", date: "2025-09-17", category: "Crypto", keywords: ["fed", "fomc", "interest rate", "monetary policy"] },
  { title: "FOMC Meeting", date: "2025-11-05", category: "Crypto", keywords: ["fed", "fomc", "interest rate", "monetary policy"] },
  { title: "FOMC Meeting", date: "2025-12-17", category: "Crypto", keywords: ["fed", "fomc", "interest rate", "monetary policy"] },
  { title: "FOMC Meeting", date: "2026-01-28", category: "Crypto", keywords: ["fed", "fomc", "interest rate", "monetary policy"] },
  { title: "FOMC Meeting", date: "2026-03-18", category: "Crypto", keywords: ["fed", "fomc", "interest rate", "monetary policy"] },
  { title: "FOMC Meeting", date: "2026-05-06", category: "Crypto", keywords: ["fed", "fomc", "interest rate", "monetary policy"] },

  // Elections
  { title: "US Midterm Elections", date: "2026-11-03", category: "Politics", keywords: ["election", "midterm", "senate", "house", "congress", "vote"] },

  // Crypto Events
  { title: "Bitcoin Halving (est.)", date: "2028-04-15", category: "Crypto", keywords: ["bitcoin", "halving", "btc"] },
  { title: "Ethereum Dencun Upgrade", date: "2025-03-13", category: "Crypto", keywords: ["ethereum", "dencun", "eth", "upgrade"] },

  // Sports
  { title: "Super Bowl LX", date: "2026-02-08", category: "Sports", keywords: ["super bowl", "nfl", "football"] },
  { title: "March Madness", date: "2026-03-17", category: "Sports", keywords: ["march madness", "ncaa", "basketball"] },
  { title: "NBA Finals", date: "2026-06-04", category: "Sports", keywords: ["nba", "finals", "basketball"] },
  { title: "World Cup 2026", date: "2026-06-11", category: "Sports", keywords: ["world cup", "fifa", "soccer", "football"] },
  { title: "Olympics 2028 (LA)", date: "2028-07-14", category: "Sports", keywords: ["olympics", "summer games"] },

  // Tech
  { title: "WWDC 2026", date: "2026-06-08", category: "Tech", keywords: ["apple", "wwdc", "ios", "iphone"] },
  { title: "Google I/O 2026", date: "2026-05-12", category: "Tech", keywords: ["google", "io", "android", "ai"] },

  // World Events
  { title: "COP31 Climate Summit", date: "2026-11-09", category: "World Events", keywords: ["climate", "cop", "environment", "carbon"] },
  { title: "G7 Summit 2026", date: "2026-06-15", category: "World Events", keywords: ["g7", "summit", "leaders"] },
];

export function getUpcomingEvents(daysAhead: number = 90): typeof STATIC_EVENTS {
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  return STATIC_EVENTS.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= now && eventDate <= cutoff;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
