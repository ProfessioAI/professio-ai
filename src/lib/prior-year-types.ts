// What the prior-year reader returns: figures read from a filed return, what carries over to the
// next year, what is missing, and where the return and the IRS transcript disagree.

export const FIGURE_FIELDS = [
  "wages",
  "taxable_interest",
  "capital_gain_loss",
  "total_income",
  "agi",
  "taxable_income",
  "total_tax",
  "total_payments",
  "refund",
  "applied_to_next_year",
] as const;
export type FigureField = (typeof FIGURE_FIELDS)[number];

/** The Form 1040 line each figure comes from, in plain words, for the reader and the prompt. */
export const FIGURE_LINES: Record<FigureField, string> = {
  wages: "Line 1z, total wages",
  taxable_interest: "Line 2b, taxable interest",
  capital_gain_loss: "Line 7, capital gain or (loss); a loss is negative",
  total_income: "Line 9, total income",
  agi: "Line 11, adjusted gross income",
  taxable_income: "Line 15, taxable income",
  total_tax: "Line 24, total tax",
  total_payments: "Line 33, total payments",
  refund: "Line 35a, refund",
  applied_to_next_year:
    "Line 36, overpayment applied to next year's estimated tax",
};

export const CARRYOVER_TYPES = [
  "capital_loss_short_term",
  "capital_loss_long_term",
  "passive_activity_loss",
  "depreciation_remaining_basis",
  "ira_basis_8606",
  "overpayment_applied",
  "net_operating_loss",
  "charitable_contribution",
  "credit_carryforward",
  "state_carryover",
  "other",
] as const;
export type CarryoverType = (typeof CARRYOVER_TYPES)[number];

export type Figure = {
  value: number | null;
  /** Set instead of `value` when the amount was hidden from the AI, like [AMOUNT_3]. */
  token: string | null;
  /** The page number from the "=== PAGE n of N" heading. */
  page: number | null;
  line: string | null;
};

export type Carryover = {
  type: CarryoverType;
  description: string;
  /** Null when it can't be determined. */
  amount: number | null;
  /** Set instead of `amount` when the amount was hidden from the AI. */
  amountToken: string | null;
  /** "found": a document states it. "unknown": it exists or may exist, but the documents don't show it. */
  status: "found" | "unknown";
  document: string | null;
  page: number | null;
  line: string | null;
  note: string;
};

export type MissingItem = {
  item: string;
  kind: "document" | "schedule" | "information";
  reason: string;
};

export type Conflict = {
  description: string;
  returnValue: number | null;
  returnToken: string | null;
  otherValue: number | null;
  otherToken: string | null;
  /** Where the other number comes from, e.g. "IRS wage and income transcript". */
  otherSource: string;
};

export type PriorYearReport = {
  taxYear: string | null;
  filingStatus: string | null;
  preparer: string | null;
  figures: Record<FigureField, Figure>;
  carryovers: Carryover[];
  missingItems: MissingItem[];
  conflicts: Conflict[];
  /** Questions and unknowns for the preparer. */
  confirm: string[];
  /** A short draft email asking the client for what is missing; empty if nothing is. */
  clientEmail: string;
};

export type PriorYearResponse = {
  report: PriorYearReport;
  /** The same report as readable text. */
  markdown: string;
  usage?: import("./usage").UsageReport;
};
