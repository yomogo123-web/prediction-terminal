import { Market, Alert } from "./types";

export function checkAlerts(markets: Market[], alerts: Alert[]): Alert[] {
  const triggered: Alert[] = [];
  const marketMap = new Map(markets.map((m) => [m.id, m]));

  for (const alert of alerts) {
    if (!alert.active) continue;
    const market = marketMap.get(alert.marketId);
    if (!market) continue;

    let fired = false;
    switch (alert.condition) {
      case "above":
        fired = market.probability >= alert.threshold;
        break;
      case "below":
        fired = market.probability <= alert.threshold;
        break;
      case "change":
        fired = Math.abs(market.change24h) >= alert.threshold;
        break;
    }

    if (fired) {
      triggered.push(alert);
    }
  }

  return triggered;
}
