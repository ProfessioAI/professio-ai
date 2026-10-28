import { EARNED_INCOME_CREDIT as E } from "./years/2024";
import { roundDollar } from "./tax";

// The earned income credit (Form 1040 line 27) for filers who are not self-employed (Worksheet A).

export type EicGroup = "other" | "mfj";
export type EicKids = 0 | 1 | 2 | 3;

/** The credit as a formula, before the Table's rounding. */
function formulaCredit(income: number, group: EicGroup, kids: EicKids): number {
  const growing = Math.min(income * E.rate[kids], E.maxCredit[kids]);
  const over = Math.max(0, income - E.phaseOutStart[group][kids]);
  return Math.max(
    0,
    Math.min(growing, E.maxCredit[kids] - over * E.phaseOutRate[kids]),
  );
}

/** The $50 row of the EIC Table that an amount falls in: [at least, less than]. */
export function eicRow(amount: number): [number, number] | null {
  if (amount < 1) return null;
  const a = Math.floor(amount);
  if (a < E.tableRow) return [1, E.tableRow];
  const start = Math.floor(a / E.tableRow) * E.tableRow;
  return [start, start + E.tableRow];
}

/**
 * The credit looked up in the EIC Table for an amount: the formula applied to the middle of the
 * amount's row, rounded to the dollar. Zero above the end of the table.
 */
export function eicTableCredit(
  amount: number,
  group: EicGroup,
  kids: EicKids,
): number {
  const row = eicRow(amount);
  if (!row) return 0;
  const [low, high] = row;
  // Strictly inside: a row that starts exactly at the turning point is worked out normally.
  const inRow = (x: number) => low < x && x < high;
  // The IRS Table gives the full credit for a row that contains where the credit tops out or where
  // it starts to shrink, and nothing for the row that contains where it runs out.
  if (inRow(E.earnedIncomeAmount[kids]) || inRow(E.phaseOutStart[group][kids]))
    return E.maxCredit[kids];
  if (inRow(E.completedPhaseOut[group][kids])) return 0;
  return roundDollar(formulaCredit((low + high) / 2, group, kids));
}

export type EicFacts = {
  group: EicGroup;
  /** Qualifying children with a valid SSN, at most 3 counted. */
  kids: number;
  earnedIncome: number;
  agi: number;
};

/** Worksheet A: look up earned income; if AGI is different and high enough, look up AGI too and take the smaller. */
export function eicWorksheetA(f: EicFacts) {
  const kids = Math.min(3, f.kids) as EicKids;
  const fromEarned = eicTableCredit(f.earnedIncome, f.group, kids);
  if (fromEarned === 0)
    return { credit: 0, fromEarned, fromAgi: null as number | null };
  if (f.agi === f.earnedIncome)
    return { credit: fromEarned, fromEarned, fromAgi: null };
  const threshold = E.phaseOutStart[f.group][kids];
  if (f.agi < threshold)
    return { credit: fromEarned, fromEarned, fromAgi: null };
  const fromAgi = eicTableCredit(f.agi, f.group, kids);
  return { credit: Math.min(fromEarned, fromAgi), fromEarned, fromAgi };
}
