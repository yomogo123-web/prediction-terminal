/**
 * Polymarket WebSocket manager — connects to the CLOB real-time feed
 * and streams last_trade_price events.
 */

const WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";
const PING_INTERVAL = 10_000;
const MAX_BACKOFF = 30_000;

export interface PolymarketWSOptions {
  onPriceUpdate: (updates: Map<string, number>) => void;
  onConnectionChange: (connected: boolean) => void;
}

export class PolymarketWS {
  private ws: WebSocket | null = null;
  private subscribedIds: Set<string> = new Set();
  private pendingUpdates: Map<string, number> = new Map();
  private rafHandle: number | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private intentionallyClosed = false;
  private onPriceUpdate: (updates: Map<string, number>) => void;
  private onConnectionChange: (connected: boolean) => void;

  constructor(options: PolymarketWSOptions) {
    this.onPriceUpdate = options.onPriceUpdate;
    this.onConnectionChange = options.onConnectionChange;
  }

  connect(assetIds: string[]): void {
    if (assetIds.length === 0) return;
    this.intentionallyClosed = false;

    try {
      this.ws = new WebSocket(WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.onConnectionChange(true);
      this.subscribe(assetIds);
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = () => {
      this.onConnectionChange(false);
      this.stopPing();
      if (!this.intentionallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror, which handles reconnect
    };
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    this.stopPing();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    this.subscribedIds.clear();
    this.pendingUpdates.clear();
    this.onConnectionChange(false);
  }

  updateSubscription(newIds: string[]): void {
    const newSet = new Set(newIds);

    // Find IDs to unsubscribe (in old but not in new)
    const toUnsub: string[] = [];
    this.subscribedIds.forEach((id) => {
      if (!newSet.has(id)) toUnsub.push(id);
    });

    // Find IDs to subscribe (in new but not in old)
    const toSub: string[] = [];
    newSet.forEach((id) => {
      if (!this.subscribedIds.has(id)) toSub.push(id);
    });

    if (toUnsub.length > 0) {
      this.sendJson({ asset_ids: toUnsub, type: "MARKET_CHANNEL", action: "unsubscribe" });
      toUnsub.forEach((id) => this.subscribedIds.delete(id));
    }

    if (toSub.length > 0) {
      this.sendJson({ asset_ids: toSub, type: "MARKET_CHANNEL" });
      toSub.forEach((id) => this.subscribedIds.add(id));
    }
  }

  private subscribe(assetIds: string[]): void {
    if (assetIds.length === 0) return;
    this.sendJson({ asset_ids: assetIds, type: "MARKET_CHANNEL" });
    this.subscribedIds = new Set(assetIds);
  }

  private handleMessage(raw: string | ArrayBuffer | Blob): void {
    if (typeof raw !== "string") return;

    try {
      const data = JSON.parse(raw);

      // Handle array of events
      const events: unknown[] = Array.isArray(data) ? data : [data];
      events.forEach((evt: unknown) => {
        const event = evt as Record<string, unknown>;
        const assetId = event.asset_id as string | undefined;
        const priceStr = event.last_trade_price as string | number | undefined;

        if (!assetId || priceStr === undefined) return;

        const price = typeof priceStr === "string" ? parseFloat(priceStr) : priceStr;
        if (isNaN(price)) return;

        // Polymarket prices are 0-1 decimal; convert to 0-100
        const probability = price * 100;
        this.pendingUpdates.set(assetId, probability);
      });

      this.scheduleFlush();
    } catch {
      // Ignore unparseable messages (e.g. pong responses)
    }
  }

  private scheduleFlush(): void {
    if (this.rafHandle !== null) return;
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null;
      if (this.pendingUpdates.size === 0) return;
      const batch = new Map(this.pendingUpdates);
      this.pendingUpdates.clear();
      this.onPriceUpdate(batch);
    });
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.sendRaw("PING");
    }, PING_INTERVAL);
  }

  private stopPing(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionallyClosed) return;
    if (this.reconnectTimer !== null) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      const ids = Array.from(this.subscribedIds);
      this.connect(ids.length > 0 ? ids : []);
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_BACKOFF);
  }

  private sendJson(payload: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private sendRaw(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    }
  }
}
