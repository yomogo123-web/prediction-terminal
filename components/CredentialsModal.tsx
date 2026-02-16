"use client";

import { useTerminalStore } from "@/lib/store";
import { useState } from "react";

const PLATFORM_CONFIGS = [
  {
    id: "polymarket",
    name: "Polymarket",
    fields: [
      { key: "apiKey", label: "API Key", type: "text" },
      { key: "apiSecret", label: "API Secret", type: "password" },
      { key: "passphrase", label: "Passphrase", type: "password" },
    ],
    instructions: "Generate API keys at polymarket.com/settings",
  },
  {
    id: "kalshi",
    name: "Kalshi",
    fields: [
      { key: "apiKey", label: "API Key", type: "text" },
      { key: "privateKeyPem", label: "RSA Private Key (PEM)", type: "textarea" },
    ],
    instructions: "Generate an RSA API key at kalshi.com/account/api-keys",
  },
  {
    id: "manifold",
    name: "Manifold",
    fields: [
      { key: "apiKey", label: "API Key", type: "text" },
    ],
    instructions: "Find your API key at manifold.markets/profile",
  },
];

export default function CredentialsModal() {
  const showCredentialsModal = useTerminalStore((s) => s.showCredentialsModal);
  const setShowCredentialsModal = useTerminalStore((s) => s.setShowCredentialsModal);
  const credentialStatuses = useTerminalStore((s) => s.credentialStatuses);
  const fetchCredentialStatuses = useTerminalStore((s) => s.fetchCredentialStatuses);
  const polymarketLinked = useTerminalStore((s) => s.polymarketLinked);
  const polymarketWallet = useTerminalStore((s) => s.polymarketWallet);
  const checkPolymarketLink = useTerminalStore((s) => s.checkPolymarketLink);

  const [activeTab, setActiveTab] = useState("polymarket");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showApiKeyFallback, setShowApiKeyFallback] = useState(false);
  const [walletInput, setWalletInput] = useState("");
  const [linking, setLinking] = useState(false);

  if (!showCredentialsModal) return null;

  const config = PLATFORM_CONFIGS.find((c) => c.id === activeTab)!;
  const status = credentialStatuses.find((s) => s.platform === activeTab);
  const isConfigured = status?.configured || false;
  const isWalletLinked = activeTab === "polymarket" && polymarketLinked;

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: activeTab, credentials: formValues }),
      });
      if (res.ok) {
        setMessage("Saved");
        setFormValues({});
        fetchCredentialStatuses();
      } else {
        const data = await res.json();
        setMessage(data.error || "Save failed");
      }
    } catch {
      setMessage("Save failed");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    setMessage("");
    try {
      await fetch("/api/settings/credentials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: activeTab }),
      });
      setMessage("Removed");
      fetchCredentialStatuses();
    } catch {
      setMessage("Delete failed");
    }
    setSaving(false);
  };

  const handleWalletLink = async () => {
    if (!walletInput.trim()) return;
    setLinking(true);
    setMessage("");
    try {
      const res = await fetch("/api/dome/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerAddress: walletInput.trim(), walletType: "eoa" }),
      });
      if (res.ok) {
        setMessage("Wallet linked");
        setWalletInput("");
        checkPolymarketLink();
        fetchCredentialStatuses();
      } else {
        const data = await res.json();
        setMessage(data.error || "Link failed");
      }
    } catch {
      setMessage("Link failed");
    }
    setLinking(false);
  };

  const truncateWallet = (addr: string) =>
    addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-terminal-panel border border-terminal-border w-[450px] max-w-[90vw] font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border">
          <span className="text-terminal-amber text-xs font-bold uppercase tracking-wider">
            API Credentials
          </span>
          <button
            onClick={() => setShowCredentialsModal(false)}
            className="text-terminal-muted hover:text-terminal-text text-sm"
          >
            x
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-terminal-border">
          {PLATFORM_CONFIGS.map((cfg) => {
            const cfgStatus = credentialStatuses.find((s) => s.platform === cfg.id);
            const cfgLinked = cfg.id === "polymarket" && polymarketLinked;
            return (
              <button
                key={cfg.id}
                onClick={() => { setActiveTab(cfg.id); setFormValues({}); setMessage(""); setShowApiKeyFallback(false); }}
                className={`flex-1 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  activeTab === cfg.id
                    ? "text-terminal-amber border-b border-terminal-amber"
                    : "text-terminal-muted hover:text-terminal-text"
                }`}
              >
                {cfg.name}
                <span className={`ml-1 text-[8px] ${cfgStatus?.configured || cfgLinked ? "text-terminal-green" : "text-terminal-red"}`}>
                  {cfgStatus?.configured || cfgLinked ? "OK" : "--"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          {/* Polymarket: Wallet Connect primary, API keys as fallback */}
          {activeTab === "polymarket" && !showApiKeyFallback ? (
            <>
              {/* Status badge */}
              <div className="flex items-center gap-2">
                {isWalletLinked ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 border text-terminal-green border-terminal-green/30">
                    CONNECTED — {truncateWallet(polymarketWallet || "")}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 border text-terminal-red border-terminal-red/30">
                    NOT CONNECTED
                  </span>
                )}
              </div>

              <div className="text-[10px] text-terminal-muted">
                Connect your wallet to trade on Polymarket via Dome — no API keys needed.
              </div>

              {!isWalletLinked && (
                <>
                  <div>
                    <label className="text-[9px] text-terminal-muted uppercase tracking-wider">
                      Wallet Address
                    </label>
                    <input
                      type="text"
                      value={walletInput}
                      onChange={(e) => setWalletInput(e.target.value)}
                      placeholder="0x..."
                      className="w-full mt-0.5 bg-terminal-bg border border-terminal-border px-2 py-1.5 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
                    />
                  </div>

                  <button
                    onClick={handleWalletLink}
                    disabled={linking || !walletInput.trim()}
                    className="w-full py-2 text-xs font-mono font-bold border border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 disabled:opacity-30 transition-colors"
                  >
                    {linking ? "CONNECTING..." : "CONNECT WALLET"}
                  </button>
                </>
              )}

              {/* Message */}
              {message && (
                <div className={`text-[10px] font-mono ${message === "Wallet linked" ? "text-terminal-green" : "text-terminal-red"}`}>
                  {message}
                </div>
              )}

              <button
                onClick={() => setShowApiKeyFallback(true)}
                className="w-full text-[9px] text-terminal-muted hover:text-terminal-text transition-colors underline"
              >
                Use API Keys Instead
              </button>
            </>
          ) : (
            <>
              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 border ${
                  isConfigured
                    ? "text-terminal-green border-terminal-green/30"
                    : "text-terminal-red border-terminal-red/30"
                }`}>
                  {isConfigured ? "CONFIGURED" : "NOT CONFIGURED"}
                </span>
                {status?.method === "wallet" && (
                  <span className="text-[10px] font-mono px-2 py-0.5 border text-terminal-amber border-terminal-amber/30">
                    VIA WALLET
                  </span>
                )}
              </div>

              {/* Instructions */}
              <div className="text-[10px] text-terminal-muted">
                {config.instructions}
              </div>

              {/* Fields */}
              {config.fields.map((field) => (
                <div key={field.key}>
                  <label className="text-[9px] text-terminal-muted uppercase tracking-wider">
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={formValues[field.key] || ""}
                      onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                      placeholder={isConfigured ? "••••••••" : "-----BEGIN RSA PRIVATE KEY-----\n..."}
                      rows={4}
                      className="w-full mt-0.5 bg-terminal-bg border border-terminal-border px-2 py-1.5 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber resize-none"
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formValues[field.key] || ""}
                      onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                      placeholder={isConfigured ? "••••••••" : ""}
                      className="w-full mt-0.5 bg-terminal-bg border border-terminal-border px-2 py-1.5 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
                    />
                  )}
                </div>
              ))}

              {/* Message */}
              {message && (
                <div className={`text-[10px] font-mono ${message === "Saved" || message === "Removed" ? "text-terminal-green" : "text-terminal-red"}`}>
                  {message}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving || config.fields.some((f) => !formValues[f.key])}
                  className="flex-1 py-1.5 text-xs font-mono font-bold border border-terminal-green text-terminal-green hover:bg-terminal-green/10 disabled:opacity-30 transition-colors"
                >
                  {saving ? "SAVING..." : "SAVE"}
                </button>
                {isConfigured && (
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="py-1.5 px-3 text-xs font-mono border border-terminal-red text-terminal-red hover:bg-terminal-red/10 disabled:opacity-30 transition-colors"
                  >
                    DELETE
                  </button>
                )}
              </div>

              {/* Back to wallet connect for Polymarket */}
              {activeTab === "polymarket" && showApiKeyFallback && (
                <button
                  onClick={() => setShowApiKeyFallback(false)}
                  className="w-full text-[9px] text-terminal-muted hover:text-terminal-text transition-colors underline"
                >
                  Back to Wallet Connect
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
