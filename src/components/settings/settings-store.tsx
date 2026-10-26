"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { sanitizeVars } from "@/lib/custom-theme";
import {
  APPEARANCE_ATTRIBUTES,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  sanitizeSettings,
  type Settings,
} from "@/lib/settings";

// Settings live in this browser's localStorage. Any change is saved at once, applied to
// the page, and shared with other tabs.

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(SETTINGS_KEY);
  } catch {
    return null; // Storage blocked or unavailable: settings last for this visit only.
  }
}

function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// The custom-color variables currently set on <html>, so they can be removed again.
let appliedVars: string[] = [];

/** Puts the appearance settings on <html> for the stylesheet to read, and applies custom colors. */
function applyAppearance(settings: Settings) {
  const root = document.documentElement;
  for (const [attribute, key] of Object.entries(APPEARANCE_ATTRIBUTES)) {
    root.setAttribute(`data-${attribute}`, String(settings[key]));
  }
  const vars = sanitizeVars(settings.themeVars);
  for (const name of appliedVars)
    if (!(name in vars)) root.style.removeProperty(name);
  for (const [name, value] of Object.entries(vars))
    root.style.setProperty(name, value);
  appliedVars = Object.keys(vars);
}

export type SettingsApi = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsApi | null>(null);

// When storage is blocked, changes can't be saved, so they're kept here for this visit.
let memoryOnly: Settings | null = null;

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // On the server nothing is stored, so the first render matches the server's.
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const settings = useMemo(
    () => (raw === null && memoryOnly ? memoryOnly : parseSettings(raw)),
    [raw],
  );

  useEffect(() => applyAppearance(settings), [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    const next = sanitizeSettings({
      ...(memoryOnly ?? parseSettings(readRaw())),
      ...patch,
    });
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      memoryOnly = null;
    } catch {
      memoryOnly = next;
    }
    notify();
  }, []);

  const reset = useCallback(() => {
    memoryOnly = null;
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch {
      // Nothing to remove.
    }
    notify();
  }, []);

  const api = useMemo(
    () => ({ settings, update, reset }),
    [settings, update, reset],
  );
  return (
    <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsApi {
  const api = useContext(SettingsContext);
  if (!api)
    throw new Error("useSettings must be used inside <SettingsProvider>");
  return api;
}
