"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    if (typeof window !== "undefined") {
      const wasDismissed = localStorage.getItem("predict_install_dismissed");
      if (wasDismissed) setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("predict_install_dismissed", "true");
    }
  };

  if (installed || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-10 left-4 z-40 bg-terminal-panel border border-terminal-amber/30 px-4 py-2 font-mono shadow-lg max-w-xs">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-terminal-amber text-[10px] font-bold uppercase tracking-wider">
          Install App
        </span>
        <button
          onClick={handleDismiss}
          className="text-terminal-muted hover:text-terminal-text text-xs"
        >
          x
        </button>
      </div>
      <div className="text-[10px] text-terminal-muted mb-2">
        Install PREDICT Terminal for faster access and offline support.
      </div>
      <button
        onClick={handleInstall}
        className="w-full py-1.5 text-xs font-mono font-bold border border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 transition-colors"
      >
        INSTALL
      </button>
    </div>
  );
}
