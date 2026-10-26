"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { addReports, emptyReport, type UsageReport } from "@/lib/usage";

// Running totals live in this browser's localStorage, so they survive reloads but
// belong to this browser only. Per-account balances come later, with sign-in.

const KEY = "professioai.usage.v1";
const KEEP_DAYS = 90;

type Stored = {
  /** When tracking started in this browser (ISO time). */
  since: string;
  total: UsageReport;
  /** Dollars used per local day, "YYYY-MM-DD". */
  byDay: Record<string, number>;
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the totals.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // Storage blocked or unavailable.
  }
}

function parse(raw: string | null): Stored | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Stored;
    if (
      typeof s?.since !== "string" ||
      typeof s?.total?.costUsd !== "number" ||
      !s.total.tokens
    )
      return null;
    return {
      since: s.since,
      total: s.total,
      byDay: s.byDay && typeof s.byDay === "object" ? s.byDay : {},
    };
  } catch {
    return null;
  }
}

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export type UsageMeter = {
  /** What this conversation has used. Starts over with each new conversation. */
  conversation: UsageReport;
  /** Dollars used today, in this browser. */
  todayUsd: number;
  /** Everything used in this browser since tracking began. */
  total: UsageReport;
  since: string | null;
  record: (report: UsageReport) => void;
  startConversation: () => void;
  resetAll: () => void;
};

export function useUsageMeter(): UsageMeter {
  const [conversation, setConversation] = useState<UsageReport>(emptyReport);

  // On the server there is nothing stored, so the first render matches the server's.
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const stored = useMemo(() => parse(raw), [raw]);

  const record = useCallback((report: UsageReport) => {
    if (
      report.costUsd <= 0 &&
      report.tokens.output <= 0 &&
      report.tokens.input <= 0
    )
      return;
    setConversation((prev) => addReports(prev, report));

    // Read the latest from storage, not from state, so two tabs don't overwrite each other.
    const current = parse(readRaw()) ?? {
      since: new Date().toISOString(),
      total: emptyReport(),
      byDay: {},
    };
    const today = dayKey();
    const byDay = {
      ...current.byDay,
      [today]:
        Math.round(((current.byDay[today] ?? 0) + report.costUsd) * 1e6) / 1e6,
    };
    const days = Object.keys(byDay).sort();
    for (const d of days.slice(0, Math.max(0, days.length - KEEP_DAYS)))
      delete byDay[d];

    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          since: current.since,
          total: addReports(current.total, report),
          byDay,
        }),
      );
    } catch {
      // Storage full or blocked: this conversation's numbers still show.
    }
    notify();
  }, []);

  const startConversation = useCallback(
    () => setConversation(emptyReport()),
    [],
  );

  const resetAll = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nothing to clear.
    }
    setConversation(emptyReport());
    notify();
  }, []);

  return {
    conversation,
    todayUsd: stored?.byDay[dayKey()] ?? 0,
    total: stored?.total ?? emptyReport(),
    since: stored?.since ?? null,
    record,
    startConversation,
    resetAll,
  };
}
