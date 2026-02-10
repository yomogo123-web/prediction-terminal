import { Market, PricePoint, Category } from "./types";

function generatePriceHistory(currentProb: number, days: number = 90): PricePoint[] {
  const points: PricePoint[] = [];
  const now = Math.floor(Date.now() / 1000);
  const interval = (days * 24 * 60 * 60) / 200; // ~200 data points
  let prob = currentProb + (Math.random() - 0.5) * 30; // start offset from current
  prob = Math.max(5, Math.min(95, prob));

  for (let i = 0; i < 200; i++) {
    const time = now - (200 - i) * interval;
    prob += (Math.random() - 0.5) * 4;
    // drift toward current probability
    prob += (currentProb - prob) * 0.02;
    prob = Math.max(2, Math.min(98, prob));
    points.push({ time: Math.floor(time), probability: Math.round(prob * 100) / 100 });
  }

  // ensure last point matches current probability
  points.push({ time: now, probability: currentProb });
  return points;
}

function generateVolume(): number {
  return Math.floor(Math.random() * 5000000) + 50000;
}

interface MarketTemplate {
  title: string;
  description: string;
  category: Category;
  probability: number;
  change24h: number;
  endDate: string;
}

const marketTemplates: MarketTemplate[] = [
  // Politics
  {
    title: "US Presidential Election 2028 - Democrat Win",
    description: "Will the Democratic Party candidate win the 2028 US Presidential Election?",
    category: "Politics",
    probability: 48.5,
    change24h: 1.2,
    endDate: "2028-11-03",
  },
  {
    title: "US Presidential Election 2028 - Republican Win",
    description: "Will the Republican Party candidate win the 2028 US Presidential Election?",
    category: "Politics",
    probability: 51.5,
    change24h: -1.2,
    endDate: "2028-11-03",
  },
  {
    title: "US Government Shutdown Before April 2026",
    description: "Will the US federal government shut down before April 1, 2026?",
    category: "Politics",
    probability: 35.0,
    change24h: 5.3,
    endDate: "2026-04-01",
  },
  {
    title: "UK General Election Before 2029",
    description: "Will the UK hold a general election before January 1, 2029?",
    category: "Politics",
    probability: 22.0,
    change24h: -0.5,
    endDate: "2029-01-01",
  },
  {
    title: "EU Admits New Member by 2028",
    description: "Will the European Union admit a new member state by December 31, 2028?",
    category: "Politics",
    probability: 15.0,
    change24h: 0.3,
    endDate: "2028-12-31",
  },
  {
    title: "US Federal Interest Rate Cut by June 2026",
    description: "Will the Federal Reserve cut interest rates by at least 25bps before June 30, 2026?",
    category: "Politics",
    probability: 72.0,
    change24h: 3.1,
    endDate: "2026-06-30",
  },
  // Sports
  {
    title: "Lakers Win 2026 NBA Championship",
    description: "Will the Los Angeles Lakers win the 2025-26 NBA Championship?",
    category: "Sports",
    probability: 12.5,
    change24h: 2.1,
    endDate: "2026-06-30",
  },
  {
    title: "Real Madrid Win Champions League 2026",
    description: "Will Real Madrid win the 2025-26 UEFA Champions League?",
    category: "Sports",
    probability: 18.0,
    change24h: -1.5,
    endDate: "2026-06-01",
  },
  {
    title: "Chiefs Win Super Bowl LXI",
    description: "Will the Kansas City Chiefs win Super Bowl LXI?",
    category: "Sports",
    probability: 8.5,
    change24h: -0.8,
    endDate: "2027-02-14",
  },
  {
    title: "Djokovic Wins Australian Open 2027",
    description: "Will Novak Djokovic win the 2027 Australian Open?",
    category: "Sports",
    probability: 6.0,
    change24h: -2.0,
    endDate: "2027-01-31",
  },
  {
    title: "World Cup 2026 - Brazil Winner",
    description: "Will Brazil win the 2026 FIFA World Cup?",
    category: "Sports",
    probability: 14.0,
    change24h: 0.5,
    endDate: "2026-07-19",
  },
  {
    title: "Ohtani NL MVP 2026",
    description: "Will Shohei Ohtani win the National League MVP award for 2026?",
    category: "Sports",
    probability: 22.0,
    change24h: 4.2,
    endDate: "2026-11-15",
  },
  // Crypto
  {
    title: "Bitcoin Above $200K by End of 2026",
    description: "Will Bitcoin's price exceed $200,000 USD before December 31, 2026?",
    category: "Crypto",
    probability: 32.0,
    change24h: 4.5,
    endDate: "2026-12-31",
  },
  {
    title: "Ethereum Above $10K by End of 2026",
    description: "Will Ethereum's price exceed $10,000 USD before December 31, 2026?",
    category: "Crypto",
    probability: 25.0,
    change24h: 2.8,
    endDate: "2026-12-31",
  },
  {
    title: "Bitcoin ETF AUM Exceeds $200B",
    description: "Will total Bitcoin ETF assets under management exceed $200 billion before end of 2026?",
    category: "Crypto",
    probability: 45.0,
    change24h: 1.9,
    endDate: "2026-12-31",
  },
  {
    title: "Solana Flips Ethereum Market Cap",
    description: "Will Solana's market cap exceed Ethereum's at any point before end of 2027?",
    category: "Crypto",
    probability: 8.0,
    change24h: -1.2,
    endDate: "2027-12-31",
  },
  {
    title: "Total Crypto Market Cap Above $10T",
    description: "Will the total cryptocurrency market cap exceed $10 trillion before end of 2026?",
    category: "Crypto",
    probability: 28.0,
    change24h: 3.3,
    endDate: "2026-12-31",
  },
  {
    title: "Stablecoin Regulation Passed in US",
    description: "Will comprehensive stablecoin regulation be signed into law in the US by end of 2026?",
    category: "Crypto",
    probability: 55.0,
    change24h: -2.1,
    endDate: "2026-12-31",
  },
  // Tech
  {
    title: "Apple Releases AR Glasses in 2026",
    description: "Will Apple release standalone AR glasses (not Vision Pro) before end of 2026?",
    category: "Tech",
    probability: 18.0,
    change24h: -3.2,
    endDate: "2026-12-31",
  },
  {
    title: "GPT-5 Released Before July 2026",
    description: "Will OpenAI release GPT-5 (or equivalent next-gen model) before July 1, 2026?",
    category: "Tech",
    probability: 65.0,
    change24h: -5.1,
    endDate: "2026-07-01",
  },
  {
    title: "Tesla Full Self-Driving L4 Approval",
    description: "Will Tesla receive regulatory L4 autonomous driving approval in any US state by end of 2026?",
    category: "Tech",
    probability: 20.0,
    change24h: 1.8,
    endDate: "2026-12-31",
  },
  {
    title: "TikTok Banned in US",
    description: "Will TikTok be effectively banned (unavailable in app stores) in the US by end of 2026?",
    category: "Tech",
    probability: 30.0,
    change24h: -4.0,
    endDate: "2026-12-31",
  },
  {
    title: "Nvidia Market Cap Exceeds $5T",
    description: "Will Nvidia's market capitalization exceed $5 trillion before end of 2026?",
    category: "Tech",
    probability: 40.0,
    change24h: 2.5,
    endDate: "2026-12-31",
  },
  {
    title: "Twitter/X Monthly Active Users Below 400M",
    description: "Will X (formerly Twitter) report monthly active users below 400 million at any point in 2026?",
    category: "Tech",
    probability: 35.0,
    change24h: 1.0,
    endDate: "2026-12-31",
  },
  // World Events
  {
    title: "Ukraine-Russia Ceasefire by End of 2026",
    description: "Will there be a formal ceasefire agreement between Ukraine and Russia before December 31, 2026?",
    category: "World Events",
    probability: 25.0,
    change24h: 6.2,
    endDate: "2026-12-31",
  },
  {
    title: "WHO Declares New Pandemic by 2027",
    description: "Will the WHO declare a new pandemic (non-COVID) before end of 2027?",
    category: "World Events",
    probability: 12.0,
    change24h: 0.5,
    endDate: "2027-12-31",
  },
  {
    title: "Global Temperature Record Broken in 2026",
    description: "Will 2026 set a new global average temperature record?",
    category: "World Events",
    probability: 58.0,
    change24h: 1.4,
    endDate: "2027-01-31",
  },
  {
    title: "Oil Price Above $120/barrel in 2026",
    description: "Will Brent crude oil price exceed $120/barrel at any point during 2026?",
    category: "World Events",
    probability: 18.0,
    change24h: -2.3,
    endDate: "2026-12-31",
  },
  {
    title: "China GDP Growth Below 4% in 2026",
    description: "Will China's official annual GDP growth rate for 2026 be below 4%?",
    category: "World Events",
    probability: 30.0,
    change24h: 1.1,
    endDate: "2027-03-01",
  },
  {
    title: "Major Earthquake (8.0+) in Pacific Ring of Fire",
    description: "Will an earthquake of magnitude 8.0 or greater occur in the Pacific Ring of Fire before end of 2026?",
    category: "World Events",
    probability: 42.0,
    change24h: 0.2,
    endDate: "2026-12-31",
  },
];

export function generateMockMarkets(): Market[] {
  return marketTemplates.map((template, index) => ({
    id: `mkt-${String(index + 1).padStart(3, "0")}`,
    title: template.title,
    description: template.description,
    category: template.category,
    probability: template.probability,
    previousProbability: template.probability,
    volume: generateVolume(),
    change24h: template.change24h,
    priceHistory: generatePriceHistory(template.probability),
    status: "active" as const,
    endDate: template.endDate,
    source: "mock" as const,
  }));
}
