"use client";

import { useEffect, useState } from "react";
import type {
  GradingRun,
  GradingSuite,
  GradingSummary,
} from "@/lib/grading-types";
import { modelInfo } from "@/lib/models";
import { Card } from "@/components/settings/controls";

const KIND_LABEL = {
  check: "Missed",
  "must-not": "Did something it shouldn't",
  "case-panel": "Case panel",
  error: "Couldn't be graded",
} as const;

const day = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function modelName(id: string) {
  try {
    return id === "default" ? "the default model" : modelInfo(id).name;
  } catch {
    return id;
  }
}

/** Bars for the last runs, on a 80% to 100% scale, with the pass threshold marked. */
function Trend({ runs, threshold }: { runs: GradingRun[]; threshold: number }) {
  const low = 80;
  const pos = (rate: number) =>
    Math.max(0, Math.min(1, (rate - low) / (100 - low)));
  return (
    <div className="py-4">
      <div
        role="img"
        aria-label={`Pass rate for the last ${runs.length} runs: ${runs
          .map((r) => `${r.rate.toFixed(1)}%`)
          .join(", ")}`}
        className="relative flex h-32 items-end gap-1.5 border-b border-border"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 border-t border-dashed border-border-strong"
          style={{ bottom: `${pos(threshold) * 100}%` }}
        >
          <span className="absolute -top-5 left-0 text-[0.6875rem] text-muted">
            {threshold}% needed
          </span>
        </div>
        {runs.map((r, i) => (
          <div
            key={r.at}
            title={`${when(r.at)} · ${r.rate.toFixed(1)}%`}
            className={`anim-grow-up min-w-1.5 flex-1 rounded-t ${
              r.rate >= threshold ? "bg-accent-text" : "bg-warn-strong"
            } ${i === runs.length - 1 ? "" : "opacity-60"}`}
            style={
              {
                height: `${Math.max(pos(r.rate), 0.03) * 100}%`,
                "--d": `${i * 60}ms`,
              } as React.CSSProperties
            }
          >
            <span className="block pt-1 text-center text-[0.6875rem] font-semibold text-primary-fg tabular-nums">
              {r.rate.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted">
        <span>{day(runs[0].at)}</span>
        <span>Scale starts at {low}%</span>
        <span>{day(runs[runs.length - 1].at)}</span>
      </div>
    </div>
  );
}

function CaseList({ run }: { run: GradingRun }) {
  const sorted = [...run.cases].sort(
    (a, b) => Number(a.clean) - Number(b.clean) || a.id.localeCompare(b.id),
  );
  return (
    <ul className="flex flex-col">
      {sorted.map((c) => (
        <li
          key={c.id}
          className="border-b border-border py-2.5 last:border-b-0"
        >
          <details>
            <summary
              className={`flex cursor-pointer list-none items-center gap-3 ${
                c.failures.length ? "" : "cursor-default"
              }`}
              onClick={(e) => c.failures.length === 0 && e.preventDefault()}
            >
              <span
                aria-hidden="true"
                className={`size-2.5 shrink-0 rounded-full ${
                  c.clean ? "bg-accent-text" : "bg-warn-strong"
                }`}
              />
              <span className="min-w-0 flex-1 truncate font-mono text-[0.8125rem]">
                {c.id}
              </span>
              <span className="text-xs text-muted tabular-nums">
                {c.passed}/{c.total}
              </span>
              <span className="sr-only">
                {c.clean ? "All checks passed" : "Has misses"}
              </span>
            </summary>
            {c.failures.length ? (
              <ul className="mt-2 ml-5.5 flex flex-col gap-2 text-[0.8125rem]">
                {c.failures.map((f, i) => (
                  <li
                    key={i}
                    className="rounded-lg bg-warn-bg px-3 py-2 text-warn-fg"
                  >
                    <div className="text-xs font-semibold">
                      {KIND_LABEL[f.kind]}
                    </div>
                    <div>{f.text}</div>
                    {f.reason ? (
                      <div className="mt-1 opacity-80">{f.reason}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </details>
        </li>
      ))}
    </ul>
  );
}

export default function Quality() {
  const [data, setData] = useState<GradingSummary | null | "error">(null);
  const [suiteId, setSuiteId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/grading", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => !controller.signal.aborted && setData("error"));
    return () => controller.abort();
  }, []);

  if (data === null)
    return (
      <Card title="Answer quality">
        <p className="py-4 text-sm text-muted">Loading…</p>
      </Card>
    );
  if (data === "error" || data.suites.length === 0)
    return (
      <Card
        title="Answer quality"
        description="How well the assistant answers the fictional test documents."
      >
        <p className="py-4 text-sm leading-snug text-text-3">
          {data === "error"
            ? "Couldn't load the grading results."
            : "No grading runs yet. With the app running, run npm run grade in the project folder. The results show up here."}{" "}
          Grading results are read from the computer the app runs on.
        </p>
      </Card>
    );

  const suite: GradingSuite =
    data.suites.find((s) => s.id === suiteId) ?? data.suites[0];
  return (
    <>
      {data.suites.length > 1 ? (
        <div
          role="tablist"
          aria-label="Test set"
          className="ui-inset ui-pill flex w-fit gap-1 rounded-lg bg-background p-1"
        >
          {data.suites.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === suite.id}
              onClick={() => setSuiteId(s.id)}
              className={`h-9 rounded-lg px-4 text-sm font-medium ${
                s.id === suite.id
                  ? "ui-seg-on bg-surface text-foreground shadow-sm"
                  : "text-text-3 hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
      <SuiteView suite={suite} threshold={data.threshold} />
    </>
  );
}

function SuiteView({
  suite,
  threshold,
}: {
  suite: GradingSuite;
  threshold: number;
}) {
  const latest = suite.runs[suite.runs.length - 1];
  const ok = latest.rate >= threshold;
  const delta = suite.baseline ? latest.rate - suite.baseline.passRate : null;
  const count = latest.cases.length;
  const unit = `${suite.unit}${count === 1 ? "" : "s"}`;

  return (
    <>
      <Card
        title={`Answer quality: ${suite.label.toLowerCase()}`}
        description={`Each test ${suite.unit} is sent through the app, and an AI grader marks the answer against a checklist.`}
      >
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2 py-4">
          <div>
            <div className="font-serif text-5xl leading-none tabular-nums">
              {latest.rate.toFixed(1)}%
            </div>
            <div className="mt-1 text-[0.8125rem] text-muted">
              {latest.passed} of {latest.total} checks passed
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[0.8125rem] font-semibold ${
              ok ? "bg-accent-soft text-accent-text" : "bg-warn-bg text-warn-fg"
            }`}
          >
            {ok ? `Above the ${threshold}% bar` : `Below the ${threshold}% bar`}
          </span>
          <div className="text-[0.8125rem] text-text-3">
            {latest.cleanCases} of {count} {unit} fully clean
            {delta !== null
              ? ` · ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} points vs the saved baseline`
              : ""}
          </div>
        </div>
        <p className="border-t border-border py-3 text-xs text-muted">
          Last run {when(latest.at)} · answers by {modelName(latest.model)} ·
          graded by {modelName(latest.graderModel)}
          {suite.baseline
            ? ` · baseline ${suite.baseline.passRate.toFixed(1)}% from ${day(suite.baseline.savedAt)}`
            : ""}
        </p>
      </Card>

      {suite.runs.length > 1 ? (
        <Card
          title="Over time"
          description="Pass rate of each full run, newest on the right."
        >
          <Trend runs={suite.runs} threshold={threshold} />
        </Card>
      ) : null}

      <Card
        title={`Test ${unit}`}
        description="Ones with misses are listed first. Open one to see what was missed."
      >
        <CaseList run={latest} />
      </Card>
    </>
  );
}
