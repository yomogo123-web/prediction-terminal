"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function AuthModal({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Registration failed");
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Connection error");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 font-mono">
      <div className="bg-terminal-panel border border-terminal-border w-[400px] max-w-[90vw]">
        <div className="border-b border-terminal-border px-4 py-2 flex items-center justify-between">
          <span className="text-terminal-amber font-bold text-sm tracking-wider">
            PREDICT TERMINAL
          </span>
          <span className="text-terminal-muted text-xs">
            {mode === "login" ? "LOGIN" : "REGISTER"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="text-terminal-muted text-xs mb-2">
            {mode === "login"
              ? "Enter credentials to access terminal"
              : "Create account for persistent watchlists & alerts"}
          </div>

          {mode === "register" && (
            <div>
              <label className="text-terminal-muted text-[10px] uppercase tracking-wider">Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border px-3 py-1.5 text-sm text-terminal-text mt-0.5 focus:outline-none focus:border-terminal-amber"
                placeholder="trader"
              />
            </div>
          )}

          <div>
            <label className="text-terminal-muted text-[10px] uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-terminal-bg border border-terminal-border px-3 py-1.5 text-sm text-terminal-text mt-0.5 focus:outline-none focus:border-terminal-amber"
              placeholder="trader@example.com"
              autoFocus
            />
          </div>

          <div>
            <label className="text-terminal-muted text-[10px] uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              className="w-full bg-terminal-bg border border-terminal-border px-3 py-1.5 text-sm text-terminal-text mt-0.5 focus:outline-none focus:border-terminal-amber"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-terminal-red text-xs border border-terminal-red/30 bg-terminal-red/5 px-2 py-1">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-sm font-bold bg-terminal-amber text-terminal-bg hover:bg-terminal-amber/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "CONNECTING..." : mode === "login" ? "LOGIN" : "CREATE ACCOUNT"}
          </button>

          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="w-full py-1 text-xs text-terminal-muted hover:text-terminal-text transition-colors"
          >
            {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={onSuccess}
              className="text-[10px] text-terminal-muted hover:text-terminal-text transition-colors"
            >
              Skip — continue as guest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
