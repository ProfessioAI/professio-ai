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

export type GradingSummary = {
  /** Full runs (every test notice), oldest first. */
  runs: GradingRun[];
  baseline: { savedAt: string; passRate: number; commit: string } | null;
  /** The pass rate a run must reach, in percent. */
  threshold: number;
};
