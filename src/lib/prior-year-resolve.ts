import { amountToNumber, rehydrate, type VaultEntry } from "./scrub-types";
import type { PriorYearReport } from "./prior-year-types";

/**
 * Puts the real values back into a report the AI wrote about hidden ones: tokens inside the text
 * become what they stand for, and an amount the AI could only give as a token becomes the number.
 * It happens in the browser, where the vault is.
 */
export function resolveReport(
  report: PriorYearReport,
  vault: VaultEntry[],
): PriorYearReport {
  if (vault.length === 0) return report;
  const put = JSON.parse(JSON.stringify(report), (_key, value) =>
    typeof value === "string" ? rehydrate(value, vault) : value,
  ) as PriorYearReport;

  const number = (value: number | null, token: string | null) =>
    value === null && token !== null && !/^\[[A-Z]+_\d+\]$/.test(token)
      ? amountToNumber(token)
      : value;

  for (const fig of Object.values(put.figures)) {
    fig.value = number(fig.value, fig.token);
    if (fig.value !== null) fig.token = null;
  }
  for (const c of put.carryovers) {
    c.amount = number(c.amount, c.amountToken);
    if (c.amount !== null) c.amountToken = null;
  }
  for (const c of put.conflicts) {
    c.returnValue = number(c.returnValue, c.returnToken);
    c.otherValue = number(c.otherValue, c.otherToken);
    if (c.returnValue !== null) c.returnToken = null;
    if (c.otherValue !== null) c.otherToken = null;
  }
  return put;
}
