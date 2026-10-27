// What /api/grading returns: a summary of the saved `npm run grade` results.

export type GradingFailure = {
  kind: "check" | "must-not" | "case-panel" | "error";
  text: string;
  reason?: string;
};

export type GradingCase = {
  id: string;
  clean: boolean;
  passed: number;
  total: number;
  failures: GradingFailure[];
};

export type GradingRun = {
  /** ISO time of the run. */
  at: string;
  model: string;
  graderModel: string;
  passed: number;
  total: number;
  /** Percent of checks passed. */
  rate: number;
  cleanCases: number;
  cases: GradingCase[];
};

export type GradingSuite = {
  id: string;
  /** For the heading, e.g. "IRS notices". */
  label: string;
  /** What each test document is called, singular and plural, e.g. "notice". */
  unit: string;
  /** Full runs (every test document in the suite), oldest first. */
  runs: GradingRun[];
  baseline: { savedAt: string; passRate: number; commit: string } | null;
};

export type GradingSummary = {
  suites: GradingSuite[];
  /** The pass rate a run must reach, in percent. */
  threshold: number;
};
