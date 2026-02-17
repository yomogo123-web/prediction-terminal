type HotkeyHandler = (e: KeyboardEvent) => void;

interface HotkeyEntry {
  key: string;
  ctrl?: boolean;
  handler: HotkeyHandler;
  description: string;
}

const registry: HotkeyEntry[] = [];

export function registerHotkey(entry: HotkeyEntry): () => void {
  registry.push(entry);
  return () => {
    const idx = registry.indexOf(entry);
    if (idx >= 0) registry.splice(idx, 1);
  };
}

export function getHotkeys(): HotkeyEntry[] {
  return [...registry];
}

export function setupGlobalKeyboard(actions: {
  openCommandPalette: () => void;
  navigateMarket: (dir: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  buyAction: () => void;
  sellAction: () => void;
}): () => void {
  let gPending = false;
  let gTimer: ReturnType<typeof setTimeout> | null = null;

  const handler = (e: KeyboardEvent) => {
    const el = document.activeElement;
    const isInput = el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.tagName === "SELECT";

    // Ctrl+K always opens command palette
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      actions.openCommandPalette();
      return;
    }

    // Skip other hotkeys when typing in input
    if (isInput) return;

    // j/k for market navigation
    if (e.key === "j") {
      e.preventDefault();
      actions.navigateMarket(1);
      return;
    }
    if (e.key === "k") {
      e.preventDefault();
      actions.navigateMarket(-1);
      return;
    }

    // g+g for scroll to top (vim-style double press)
    if (e.key === "g" && !e.ctrlKey) {
      if (gPending) {
        e.preventDefault();
        actions.scrollToTop();
        gPending = false;
        if (gTimer) clearTimeout(gTimer);
        return;
      }
      gPending = true;
      gTimer = setTimeout(() => { gPending = false; }, 500);
      return;
    } else {
      gPending = false;
      if (gTimer) clearTimeout(gTimer);
    }

    // G for scroll to bottom
    if (e.key === "G") {
      e.preventDefault();
      actions.scrollToBottom();
      return;
    }

    // b for buy, s for sell
    if (e.key === "b") {
      e.preventDefault();
      actions.buyAction();
      return;
    }
    if (e.key === "s" && !e.ctrlKey) {
      e.preventDefault();
      actions.sellAction();
      return;
    }

    // Run through registered hotkeys
    for (const entry of registry) {
      const ctrlMatch = entry.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey;
      if (e.key === entry.key && ctrlMatch) {
        e.preventDefault();
        entry.handler(e);
        return;
      }
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
