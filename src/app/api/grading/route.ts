import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type {
  GradingCase,
  GradingFailure,
  GradingRun,
  GradingSummary,
} from "@/lib/grading-types";

// Summarizes the results that `npm run grade` saves in grading-results/, for the Quality tab in
// Settings. It reads local files, so it only has something to show where the grader has been run
// (your own computer, for now). It sends back counts and the reasons for misses, never the AI's
// full answers.

const THRESHOLD = 95;
const FULL_RUN_MIN_CASES = 10;
const MAX_RUNS = 20;

type RawCheck = {
  text: string;
  pass?: boolean;
  violated?: boolean;
  reason?: string;
};
type RawResult = {
  id: string;
  error: string | null;
  details: { ok: boolean; problems: string[] };
  checks: RawCheck[];
  mustNot: RawCheck[];
};
type RawRun = {
  model: string;
  graderModel: string;
  passedChecks: number;
  totalChecks: number;
  results: RawResult[];
};

/** "2026-10-27T04-26-05-790Z.json" -> "2026-10-27T04:26:05.790Z" */
function timeFromName(name: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.json$/.exec(
    name,
  );
  return m ? `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z` : null;
}

function summarizeCase(r: RawResult): GradingCase {
  const failures: GradingFailure[] = [];
  if (r.error) failures.push({ kind: "error", text: r.error });
  for (const p of r.details?.problems ?? [])
    failures.push({ kind: "case-panel", text: p });
  for (const c of r.checks ?? [])
    if (!c.pass)
      failures.push({ kind: "check", text: c.text, reason: c.reason });
  for (const c of r.mustNot ?? [])
    if (c.violated)
      failures.push({ kind: "must-not", text: c.text, reason: c.reason });
  const total = (r.checks?.length ?? 0) + (r.mustNot?.length ?? 0) + 1;
  const missed = failures.filter((f) => f.kind !== "error").length;
  return {
    id: r.id,
    clean: failures.length === 0,
    passed: r.error ? 0 : Math.max(0, total - missed),
    total,
    failures,
  };
}

export async function GET() {
  const empty: GradingSummary = {
    runs: [],
    baseline: null,
    threshold: THRESHOLD,
  };
  if (process.env.NODE_ENV === "production") return Response.json(empty);

  const root = process.cwd();
  const dir = path.join(root, "grading-results");
  const runs: GradingRun[] = [];
  if (existsSync(dir)) {
    const names = readdirSync(dir)
      .filter((n) => timeFromName(n))
      .sort();
    for (const name of names.slice(-MAX_RUNS * 3)) {
      try {
        const raw = JSON.parse(
          readFileSync(path.join(dir, name), "utf8"),
        ) as RawRun;
        if (
          !Array.isArray(raw.results) ||
          raw.results.length < FULL_RUN_MIN_CASES
        )
          continue;
        const cases = raw.results.map(summarizeCase);
        runs.push({
          at: timeFromName(name)!,
          model: String(raw.model),
          graderModel: String(raw.graderModel),
          passed: raw.passedChecks,
          total: raw.totalChecks,
          rate: raw.totalChecks
            ? (raw.passedChecks / raw.totalChecks) * 100
            : 0,
          cleanCases: cases.filter((c) => c.clean).length,
          cases,
        });
      } catch {
        // A damaged results file is skipped.
      }
    }
  }

  let baseline: GradingSummary["baseline"] = null;
  const baselinePath = path.join(
    root,
    "samples",
    "irs-notices",
    "grading-baseline.json",
  );
  if (existsSync(baselinePath)) {
    try {
      const b = JSON.parse(readFileSync(baselinePath, "utf8"));
      baseline = { savedAt: b.savedAt, passRate: b.passRate, commit: b.commit };
    } catch {
      baseline = null;
    }
  }

  return Response.json({
    runs: runs.slice(-MAX_RUNS),
    baseline,
    threshold: THRESHOLD,
  });
}
