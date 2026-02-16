import { Configuration, OrdersApi, MarketApi } from "kalshi-typescript";

const KALSHI_BASE_PATH = "https://api.elections.kalshi.com/trade-api/v2";

let config: Configuration | null | undefined;

function getConfig(): Configuration | null {
  if (config !== undefined) return config;

  const apiKey = process.env.KALSHI_API_KEY;
  const privateKeyPem = process.env.KALSHI_PRIVATE_KEY_PEM;
  if (!apiKey || !privateKeyPem) {
    config = null;
    return null;
  }

  // Env vars store PEM with literal \n — normalize to real newlines
  const normalizedPem = privateKeyPem.replace(/\\n/g, "\n");

  config = new Configuration({
    apiKey,
    privateKeyPem: normalizedPem,
    basePath: KALSHI_BASE_PATH,
  });
  return config;
}

export function getKalshiOrdersApi(): OrdersApi | null {
  const cfg = getConfig();
  if (!cfg) return null;
  return new OrdersApi(cfg);
}

export function getKalshiMarketApi(): MarketApi | null {
  const cfg = getConfig();
  if (!cfg) return null;
  return new MarketApi(cfg);
}

export function getBuilderCode(): string | null {
  return process.env.KALSHI_BUILDER_CODE || null;
}
