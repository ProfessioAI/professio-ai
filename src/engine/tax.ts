import { BRACKETS, TAX_TABLE_LIMIT, type FilingStatus } from "./years/2024";

/** Tax from the rate schedule, to the cent (the Tax Computation Worksheet, for $100,000 and up). */
export function scheduleTax(
  taxableIncome: number,
  status: FilingStatus,
): number {
  let tax = 0;
  let lower = 0;
  for (const { upTo, rate } of BRACKETS[status]) {
    const top = upTo ?? Infinity;
    if (taxableIncome > lower)
      tax += (Math.min(taxableIncome, top) - lower) * rate;
    lower = top;
    if (taxableIncome <= top) break;
  }
  return tax;
}

/** Rounds to the nearest dollar, with .50 going up (how the IRS rounds). */
export const roundDollar = (n: number) => Math.floor(n + 0.5 + 1e-9);

/** The row of the Tax Table that a taxable income falls in: [at least, but less than]. */
export function taxTableRow(taxableIncome: number): [number, number] {
  const income = Math.floor(taxableIncome); // the table works in whole dollars
  if (income < 5) return [0, 5];
  if (income < 15) return [5, 15];
  if (income < 25) return [15, 25];
  if (income < 3_000) {
    const start = Math.floor(income / 25) * 25;
    return [start, start + 25];
  }
  const start = Math.floor(income / 50) * 50;
  return [start, start + 50];
}

/**
 * The tax a person looks up in the Tax Table: the rate schedule applied to the middle of the row
 * that their taxable income falls in, rounded to the dollar. Below $5 the table shows $0.
 */
export function taxTableTax(
  taxableIncome: number,
  status: FilingStatus,
): number {
  const [low, high] = taxTableRow(taxableIncome);
  if (low === 0 && high === 5) return 0;
  return roundDollar(scheduleTax((low + high) / 2, status));
}

/** Form 1040 line 16 for income with no capital gains: the table below $100,000, the schedule above. */
export function incomeTax(taxableIncome: number, status: FilingStatus) {
  if (taxableIncome <= 0) return { tax: 0, method: "none" as const };
  if (taxableIncome < TAX_TABLE_LIMIT)
    return {
      tax: taxTableTax(taxableIncome, status),
      method: "tax-table" as const,
    };
  return {
    tax: roundDollar(scheduleTax(taxableIncome, status)),
    method: "tax-computation-worksheet" as const,
  };
}
