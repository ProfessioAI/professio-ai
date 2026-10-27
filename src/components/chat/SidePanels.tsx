"use client";

import { useEffect, useMemo, useState } from "react";
import { useSettings } from "@/components/settings/settings-store";
import type { GradingSummary } from "@/lib/grading-types";
import type { VaultEntry } from "@/lib/scrub-types";

// Extra information shown at the bottom of the right-hand panel: what the privacy scrubber hid in
// this conversation, and the latest answer-quality score.

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 text-xs font-semibold tracking-[0.06em] text-muted uppercase">
      {children}
    </div>
  );
}

const KIND_LABEL: Record<string, [string, string]> = {
  PERSON: ["person", "people"],
  ADDRESS: ["address", "addresses"],
  SSN: ["ID number", "ID numbers"],
  EIN: ["employer ID", "employer IDs"],
  PHONE: ["phone number", "phone numbers"],
  EMAIL: ["email", "emails"],
  ACCOUNT: ["account number", "account numbers"],
  ROUTING: ["routing number", "routing numbers"],
  DOB: ["birth date", "birth dates"],
  PTIN: ["preparer ID", "preparer IDs"],
  CARD: ["card number", "card numbers"],
  DATE: ["date", "dates"],
  AMOUNT: ["amount", "amounts"],
};

/** What the privacy scrubber hid from the AI in this conversation. */
export function ScrubberSection({ vault }: { vault: VaultEntry[] }) {
  const { settings } = useSettings();

  // A first or last name found alone (like [PERSON_1_FIRST]) belongs to a person already counted.
  const counts = useMemo(() => {
    const out = new Map<string, number>();
    for (const v of vault) {
      if (/_(FIRST|LAST)\]$/.test(v.token)) continue;
      out.set(v.type, (out.get(v.type) ?? 0) + 1);
    }
    return [...out.entries()].sort((a, b) => b[1] - a[1]);
  }, [vault]);
  const total = counts.reduce((n, [, c]) => n + c, 0);

  const hiding = [
    "identifiers",
    settings.scrubDates ? "dates" : null,
    settings.scrubAmounts ? "amounts" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="border-t border-border pt-5">
      <SectionLabel>Privacy scrubber</SectionLabel>
      {!settings.scrubUploads ? (
        <p className="rounded-[10px] bg-warn-bg px-3 py-2.5 text-[0.8125rem] text-warn-fg">
          Off. Messages and files are sent to the AI as written. Turn it on in
          Settings, under Data &amp; privacy.
        </p>
      ) : (
        <>
          <p className="mb-2 text-[0.8125rem] text-muted">
            On. Hiding {hiding} before anything is sent.
          </p>
          {total === 0 ? (
            <p className="text-[0.8125rem] text-text-3">
              Nothing hidden yet in this conversation.
            </p>
          ) : (
            <>
              <div className="mb-1 text-sm font-medium">
                {total} hidden from the AI
              </div>
              <ul className="flex flex-col gap-1 text-[0.8125rem] text-text-2">
                {counts.map(([type, n]) => {
                  const [one, many] = KIND_LABEL[type] ?? [
                    type.toLowerCase(),
                    `${type.toLowerCase()}s`,
                  ];
                  return (
                    <li key={type} className="flex justify-between gap-3">
                      <span>{n === 1 ? one : many}</span>
                      <span className="text-muted tabular-nums">{n}</span>
                    </li>
                  );
                })}
              </ul>
              <details className="mt-3 text-[0.8125rem]">
                <summary className="cursor-pointer text-text-3 hover:text-foreground">
                  Show what each token stands for
                </summary>
                <ul className="mt-2 flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                  {vault.map((v) => (
                    <li key={v.token} className="flex flex-col leading-snug">
                      <span className="font-mono text-xs text-muted">
                        {v.token}
                      </span>
                      <span className="break-words whitespace-pre-line">
                        {v.original}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </>
      )}
    </section>
  );
}

/** The latest answer-quality score for each test set, from the saved grading runs. */
export function QualitySection({ onOpen }: { onOpen: () => void }) {
  const [data, setData] = useState<GradingSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/grading", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Only where the grader has been run (this computer); nothing to show otherwise.
  if (!data || data.suites.length === 0) return null;

  return (
    <section className="border-t border-border pt-5">
      <SectionLabel>Answer quality</SectionLabel>
      <div className="flex flex-col gap-3">
        {data.suites.map((s) => {
          const latest = s.runs[s.runs.length - 1];
          const ok = latest.rate >= data.threshold;
          return (
            <div key={s.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{s.label}</span>
                <span
                  className={`font-semibold tabular-nums ${ok ? "text-accent-text" : "text-warn-strong"}`}
                >
                  {latest.rate.toFixed(1)}%
                </span>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-border"
                aria-hidden="true"
              >
                <div
                  className={`h-full ${ok ? "bg-accent" : "bg-bar-warn"}`}
                  style={{ width: `${Math.min(100, latest.rate)}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-muted">
                {latest.cleanCases} of {latest.cases.length} fully clean · last
                run{" "}
                {new Date(latest.at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 text-[0.8125rem] font-medium text-accent-text underline underline-offset-2"
      >
        Open the Quality page
      </button>
    </section>
  );
}
