import { DomeClient } from "@dome-api/sdk";

let client: DomeClient | null | undefined;

export function getDomeClient(): DomeClient | null {
  if (client !== undefined) return client;

  const apiKey = process.env.DOME_API_KEY;
  if (!apiKey) {
    client = null;
    return null;
  }

  client = new DomeClient({ apiKey });
  return client;
}
