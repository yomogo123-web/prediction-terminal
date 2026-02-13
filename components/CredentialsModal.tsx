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
      { key: "email", label: "Email", type: "email" },
      { key: "password", label: "Password", type: "password" },
    ],
    instructions: "Use your Kalshi account email and password",
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

  const [activeTab, setActiveTab] = useState("polymarket");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (!showCredentialsModal) return null;

  const config = PLATFORM_CONFIGS.find((c) => c.id === activeTab)!;
  const status = credentialStatuses.find((s) => s.platform === activeTab);
  const isConfigured = status?.configured || false;

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
            return (
              <button
                key={cfg.id}
                onClick={() => { setActiveTab(cfg.id); setFormValues({}); setMessage(""); }}
                className={`flex-1 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  activeTab === cfg.id
                    ? "text-terminal-amber border-b border-terminal-amber"
                    : "text-terminal-muted hover:text-terminal-text"
                }`}
              >
                {cfg.name}
                <span className={`ml-1 text-[8px] ${cfgStatus?.configured ? "text-terminal-green" : "text-terminal-red"}`}>
                  {cfgStatus?.configured ? "OK" : "--"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-2 py-0.5 border ${
              isConfigured
                ? "text-terminal-green border-terminal-green/30"
                : "text-terminal-red border-terminal-red/30"
            }`}>
              {isConfigured ? "CONFIGURED" : "NOT CONFIGURED"}
            </span>
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
              <input
                type={field.type}
                value={formValues[field.key] || ""}
                onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                placeholder={isConfigured ? "••••••••" : ""}
                className="w-full mt-0.5 bg-terminal-bg border border-terminal-border px-2 py-1.5 text-xs text-terminal-text font-mono focus:outline-none focus:border-terminal-amber"
              />
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
        </div>
      </div>
    </div>
  );
}
