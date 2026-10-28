import { z } from "zod";
import { Ledger, type Issue, type Line } from "./ledger";
import { ReturnInput, type ReturnInputRaw } from "./input";
import { eicWorksheetA } from "./eic";
import { incomeTax, roundDollar } from "./tax";
import {
  ADDITIONAL_STANDARD_DEDUCTION,
  CHILD_TAX_CREDIT as CTC,
  DEPENDENT_STANDARD_DEDUCTION,
  EARNED_INCOME_CREDIT as EIC,
  STANDARD_DEDUCTION,
  YEAR,
} from "./years/2024";

// Works out a simple 2024 Form 1040 from plain inputs. No AI is involved: every number comes from
// a rule written down here, and every line records how it was reached.
//
// Supported so far: any filing status; W-2 wages; taxable interest; ordinary dividends; unemployment
// pay; the standard deduction (with the age, blindness, and dependent rules); the tax table and
// rate schedule; the child tax credit and credit for other dependents; the additional child tax
// credit; the earned income credit (Worksheet A, for filers without self-employment income);
// withholding and estimated payments; refund or amount owed.
// Not supported yet, and reported as such rather than guessed: itemized deductions, qualified
// dividends and capital gains, self-employment, Social Security benefits,
// retirement distributions, other credits, and state returns.

export type ReturnResult = {
  year: number;
  /**
   * "complete": every line was worked out and nothing the engine can't handle is in play.
   * "incomplete": worked out as far as it can, but something that could change the answer was
   * left out (see `issues`). Don't treat the numbers as final.
   * "unsupported": a feature that changes the whole return isn't supported, so nothing is given.
   */
  status: "complete" | "incomplete" | "unsupported";
  issues: Issue[];
  lines: Record<string, Line>;
  /** Form 1040 line 35a (refund) and line 37 (amount owed). */
  refund: number;
  owed: number;
  explain: (id: string) => Line[];
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function computeReturn(raw: ReturnInputRaw): ReturnResult {
  const issues: Issue[] = [];
  const empty = (status: ReturnResult["status"]): ReturnResult => ({
    year: YEAR,
    status,
    issues,
    lines: {},
    refund: 0,
    owed: 0,
    explain: () => [],
  });

  const parsed = ReturnInput.safeParse(raw);
  if (!parsed.success) {
    issues.push({ kind: "missing", message: z.prettifyError(parsed.error) });
    return empty("incomplete");
  }
  const input = parsed.data;
  const fs = input.filingStatus;

  // --- things that change the whole return ----------------------------------------------------
  if (input.wantsToItemize)
    issues.push({
      kind: "unsupported",
      message: "Itemized deductions (Schedule A) aren't supported yet.",
    });
  if (input.spouseItemizes)
    issues.push({
      kind: "unsupported",
      message:
        "A separate return where the spouse itemizes isn't supported yet.",
    });
  if (sum(input.dividends.map((d) => d.qualifiedDividends)) > 0)
    issues.push({
      kind: "unsupported",
      message:
        "Qualified dividends need the Qualified Dividends and Capital Gain Tax Worksheet, which isn't built yet.",
    });
  if (fs === "mfj" && !input.spouse)
    issues.push({
      kind: "missing",
      message: "A joint return needs the spouse's details (age and blindness).",
    });
  if (input.dividends.some((d) => d.qualifiedDividends > d.ordinaryDividends))
    issues.push({
      kind: "missing",
      message: "Qualified dividends can't be more than ordinary dividends.",
    });
  if (issues.some((i) => i.kind === "unsupported")) return empty("unsupported");

  const L = new Ledger();
  const put = (
    id: string,
    form: string,
    line: string,
    label: string,
    amount: number,
    how: string,
    from: string[] = [],
    cite?: string,
  ) =>
    L.put({
      id,
      form,
      line,
      label,
      amount,
      how,
      from,
      ...(cite ? { cite } : {}),
    });

  // --- income -------------------------------------------------------------------------------
  const wages = put(
    "1040.1a",
    "Form 1040",
    "1a",
    "Wages from Form W-2, box 1",
    sum(input.w2s.map((w) => w.wages)),
    `${input.w2s.length} Form W-2${input.w2s.length === 1 ? "" : "s"} added up`,
  );
  const l1z = put(
    "1040.1z",
    "Form 1040",
    "1z",
    "Total wages",
    wages,
    "Line 1a (no other earned income on lines 1b to 1h)",
    ["1040.1a"],
  );
  const l2b = put(
    "1040.2b",
    "Form 1040",
    "2b",
    "Taxable interest",
    sum(input.interest.map((i) => i.taxableInterest)),
    "Form 1099-INT amounts added up",
  );
  const l3b = put(
    "1040.3b",
    "Form 1040",
    "3b",
    "Ordinary dividends",
    sum(input.dividends.map((d) => d.ordinaryDividends)),
    "Form 1099-DIV box 1a added up",
  );
  const s1l7 = put(
    "sch1.7",
    "Schedule 1",
    "7",
    "Unemployment compensation",
    sum(input.unemployment.map((u) => u.amount)),
    "Form 1099-G box 1 added up",
  );
  const s1l10 = put(
    "sch1.10",
    "Schedule 1",
    "10",
    "Additional income",
    s1l7,
    "Line 7 (no other additional income)",
    ["sch1.7"],
  );
  const l8 = put(
    "1040.8",
    "Form 1040",
    "8",
    "Additional income from Schedule 1",
    s1l10,
    "Schedule 1, line 10",
    ["sch1.10"],
  );
  const l9 = put(
    "1040.9",
    "Form 1040",
    "9",
    "Total income",
    l1z + l2b + l3b + l8,
    "Lines 1z + 2b + 3b + 8 (lines 4b, 5b, 6b and 7 are zero)",
    ["1040.1z", "1040.2b", "1040.3b", "1040.8"],
  );
  const l10 = put(
    "1040.10",
    "Form 1040",
    "10",
    "Adjustments to income",
    0,
    "No adjustments entered",
  );
  const agi = put(
    "1040.11",
    "Form 1040",
    "11",
    "Adjusted gross income",
    l9 - l10,
    "Line 9 minus line 10",
    ["1040.9", "1040.10"],
  );

  // --- standard deduction ---------------------------------------------------------------------
  const married = fs === "mfj" || fs === "mfs" || fs === "qss";
  const people = [
    input.primary,
    ...(fs === "mfj" && input.spouse ? [input.spouse] : []),
  ];
  const extras = sum(
    people.map((p) => (p.age65OrOlder ? 1 : 0) + (p.blind ? 1 : 0)),
  );
  const extraEach = married
    ? ADDITIONAL_STANDARD_DEDUCTION.married
    : ADDITIONAL_STANDARD_DEDUCTION.unmarried;
  let base = STANDARD_DEDUCTION[fs];
  let baseHow = `${fs.toUpperCase()} standard deduction for ${YEAR}`;
  if (input.canBeClaimedAsDependent) {
    const limited = Math.max(
      DEPENDENT_STANDARD_DEDUCTION.floor,
      wages + DEPENDENT_STANDARD_DEDUCTION.plusEarned,
    );
    base = Math.min(base, limited);
    baseHow = `Someone can claim you as a dependent: the larger of $${DEPENDENT_STANDARD_DEDUCTION.floor} or earned income plus $${DEPENDENT_STANDARD_DEDUCTION.plusEarned}, but no more than $${STANDARD_DEDUCTION[fs]}`;
  }
  const l12 = put(
    "1040.12",
    "Form 1040",
    "12",
    "Standard deduction",
    base + extras * extraEach,
    `${baseHow}${extras ? `, plus $${extraEach} for each of ${extras} age-65-or-blind box${extras === 1 ? "" : "es"}` : ""}`,
    ["1040.1a"],
    "2024 Form 1040 instructions, Standard Deduction Chart",
  );
  const l13 = put(
    "1040.13",
    "Form 1040",
    "13",
    "Qualified business income deduction",
    0,
    "No business income entered",
  );
  const l14 = put(
    "1040.14",
    "Form 1040",
    "14",
    "Total deductions",
    l12 + l13,
    "Line 12 + line 13",
    ["1040.12", "1040.13"],
  );
  const taxable = put(
    "1040.15",
    "Form 1040",
    "15",
    "Taxable income",
    Math.max(0, agi - l14),
    "Line 11 minus line 14, not below zero",
    ["1040.11", "1040.14"],
  );

  // --- tax ------------------------------------------------------------------------------------
  const t = incomeTax(taxable, fs);
  const l16 = put(
    "1040.16",
    "Form 1040",
    "16",
    "Tax",
    t.tax,
    t.method === "tax-table"
      ? `Tax Table lookup for taxable income $${taxable.toLocaleString("en-US")} (${fs})`
      : t.method === "tax-computation-worksheet"
        ? `Tax Computation Worksheet for taxable income $${taxable.toLocaleString("en-US")} (${fs})`
        : "No taxable income",
    ["1040.15"],
    "2024 Form 1040 instructions, Tax Table and Tax Computation Worksheets",
  );
  const l17 = put(
    "1040.17",
    "Form 1040",
    "17",
    "Amount from Schedule 2, line 3",
    0,
    "None entered",
  );
  const l18 = put(
    "1040.18",
    "Form 1040",
    "18",
    "Tax before credits",
    l16 + l17,
    "Line 16 + line 17",
    ["1040.16", "1040.17"],
  );

  // --- Schedule 8812: child tax credit and credit for other dependents --------------------------
  const kids = input.dependents.filter(
    (d) =>
      d.ageAtYearEnd < CTC.childUnderAge &&
      d.hasValidSsn &&
      d.isQualifyingChild,
  );
  const others = input.dependents.filter(
    (d) => !kids.includes(d) && d.hasTaxId,
  );
  const kidsCredit = put(
    "8812.5",
    "Schedule 8812",
    "5",
    "Child tax credit before limits",
    kids.length * CTC.perChild,
    `${kids.length} qualifying child${kids.length === 1 ? "" : "ren"} under 17 with a valid SSN × $${CTC.perChild}`,
  );
  const othersCredit = put(
    "8812.7",
    "Schedule 8812",
    "7",
    "Credit for other dependents before limits",
    others.length * CTC.perOtherDependent,
    `${others.length} other dependent${others.length === 1 ? "" : "s"} × $${CTC.perOtherDependent}`,
  );
  const before = put(
    "8812.8",
    "Schedule 8812",
    "8",
    "Credits before the income limit",
    kidsCredit + othersCredit,
    "Line 5 + line 7",
    ["8812.5", "8812.7"],
  );
  const threshold =
    fs === "mfj" ? CTC.phaseOutStart.mfj : CTC.phaseOutStart.other;
  const excess = Math.max(0, agi - threshold);
  const steps = Math.ceil(excess / 1000);
  const reduction = put(
    "8812.11",
    "Schedule 8812",
    "11",
    "Reduction for high income",
    steps * CTC.phaseOutPerThousand,
    excess > 0
      ? `$${CTC.phaseOutPerThousand} for each $1,000 (or part) that income of $${agi.toLocaleString("en-US")} is over $${threshold.toLocaleString("en-US")}`
      : `Income is not over $${threshold.toLocaleString("en-US")}`,
    ["1040.11"],
  );
  const afterLimit = put(
    "8812.12",
    "Schedule 8812",
    "12",
    "Credits after the income limit",
    Math.max(0, before - reduction),
    "Line 8 minus line 11, not below zero",
    ["8812.8", "8812.11"],
  );
  const usable = put(
    "8812.14",
    "Schedule 8812",
    "14",
    "Credit used against tax",
    Math.min(afterLimit, l18),
    "The smaller of line 12 and the tax on Form 1040 line 18 (the credit can't make tax negative)",
    ["8812.12", "1040.18"],
  );
  const l19 = put(
    "1040.19",
    "Form 1040",
    "19",
    "Child tax credit or credit for other dependents",
    usable,
    "Schedule 8812, line 14",
    ["8812.14"],
  );
  const l20 = put(
    "1040.20",
    "Form 1040",
    "20",
    "Amount from Schedule 3, line 8",
    0,
    "No other credits entered",
  );
  const l21 = put(
    "1040.21",
    "Form 1040",
    "21",
    "Total credits",
    l19 + l20,
    "Line 19 + line 20",
    ["1040.19", "1040.20"],
  );
  const l22 = put(
    "1040.22",
    "Form 1040",
    "22",
    "Tax after credits",
    Math.max(0, l18 - l21),
    "Line 18 minus line 21, not below zero",
    ["1040.18", "1040.21"],
  );
  const l23 = put(
    "1040.23",
    "Form 1040",
    "23",
    "Other taxes",
    0,
    "None entered",
  );
  const totalTax = put(
    "1040.24",
    "Form 1040",
    "24",
    "Total tax",
    l22 + l23,
    "Line 22 + line 23",
    ["1040.22", "1040.23"],
  );

  // --- additional child tax credit (the refundable part) ------------------------------------------
  const unused = put(
    "8812.16a",
    "Schedule 8812",
    "16a",
    "Credit not used against tax",
    Math.max(0, afterLimit - usable),
    "Line 12 minus line 14",
    ["8812.12", "8812.14"],
  );
  const refundableCap = put(
    "8812.16b",
    "Schedule 8812",
    "16b",
    "Most that can be refunded",
    kids.length * CTC.refundablePerChild,
    `${kids.length} qualifying child${kids.length === 1 ? "" : "ren"} × $${CTC.refundablePerChild}`,
  );
  const l17b = put(
    "8812.17",
    "Schedule 8812",
    "17",
    "Smaller of 16a and 16b",
    Math.min(unused, refundableCap),
    "The smaller of line 16a and line 16b",
    ["8812.16a", "8812.16b"],
  );
  const earned = put(
    "8812.18a",
    "Schedule 8812",
    "18a",
    "Earned income",
    wages,
    "Wages (no self-employment income entered)",
    ["1040.1a"],
  );
  const l19b = put(
    "8812.19",
    "Schedule 8812",
    "19",
    "15% of earned income over $2,500",
    earned > CTC.earnedIncomeFloor
      ? roundDollar((earned - CTC.earnedIncomeFloor) * CTC.earnedIncomeRate)
      : 0,
    `15% × (earned income − $${CTC.earnedIncomeFloor.toLocaleString("en-US")}), not below zero`,
    ["8812.18a"],
  );
  const actc = put(
    "8812.27",
    "Schedule 8812",
    "27",
    "Additional child tax credit",
    unused > 0 ? Math.min(l17b, l19b) : 0,
    "The smaller of line 17 and line 19",
    ["8812.17", "8812.19"],
    "Schedule 8812 instructions, Part II-A",
  );
  if (kids.length >= 3 && unused > 0)
    issues.push({
      kind: "warning",
      message:
        "With three or more qualifying children, the additional child tax credit may be larger under the alternate method on Schedule 8812 (Part II-B), which isn't built yet.",
    });

  // --- payments -------------------------------------------------------------------------------
  const w25a = put(
    "1040.25a",
    "Form 1040",
    "25a",
    "Tax withheld from Forms W-2",
    sum(input.w2s.map((w) => w.federalWithheld)),
    "Form W-2 box 2 added up",
  );
  const w25b = put(
    "1040.25b",
    "Form 1040",
    "25b",
    "Tax withheld from Forms 1099",
    sum(
      [...input.interest, ...input.dividends, ...input.unemployment].map(
        (x) => x.federalWithheld,
      ),
    ),
    "Withholding on Forms 1099-INT, 1099-DIV and 1099-G added up",
  );
  const w25d = put(
    "1040.25d",
    "Form 1040",
    "25d",
    "Total tax withheld",
    w25a + w25b,
    "Lines 25a + 25b + 25c (25c is zero)",
    ["1040.25a", "1040.25b"],
  );
  const l26 = put(
    "1040.26",
    "Form 1040",
    "26",
    "Estimated tax payments",
    input.estimatedPayments,
    "Entered by you",
  );
  // --- earned income credit (Form 1040 line 27, Worksheet A) --------------------------------------
  const eicKids = input.dependents.filter(
    (d) =>
      d.eligibleForEic ??
      (d.isQualifyingChild && d.hasValidSsn && d.ageAtYearEnd < 19),
  );
  const investmentIncome = l2b + l3b;
  const eicStops: string[] = [];
  if (fs === "mfs")
    eicStops.push(
      "a separate return (the special rule for separated spouses isn't built)",
    );
  if (input.canBeClaimedAsDependent)
    eicStops.push("someone can claim you as a dependent");
  if (
    !input.primary.hasValidSsn ||
    (fs === "mfj" && input.spouse && !input.spouse.hasValidSsn)
  )
    eicStops.push("a filer without a valid Social Security number");
  if (investmentIncome > EIC.investmentIncomeLimit)
    eicStops.push(
      `investment income over $${EIC.investmentIncomeLimit.toLocaleString("en-US")}`,
    );
  if (eicKids.length === 0) {
    const ages = [
      input.primary.ageAtYearEnd,
      ...(fs === "mfj" ? [input.spouse?.ageAtYearEnd] : []),
    ];
    if (ages.some((a) => a === undefined))
      issues.push({
        kind: "missing",
        message:
          "Your age (and your spouse's, on a joint return) is needed: with no children, the earned income credit is only for people aged 25 to 64.",
      });
    else if (
      !ages.some(
        (a) =>
          a! >= EIC.childlessAgeRange.min &&
          a! < EIC.childlessAgeRange.maxExclusive,
      )
    )
      eicStops.push("no qualifying children and not aged 25 to 64");
  }
  if (input.eicPreviouslyDisallowed)
    issues.push({
      kind: "warning",
      message:
        "The earned income credit was reduced or disallowed in an earlier year, so Form 8862 is needed to claim it. That form isn't built yet.",
    });
  let eicAmount = 0;
  let eicHow = eicStops.length
    ? `Doesn't apply: ${eicStops.join("; ")}`
    : "Doesn't apply";
  const eicFrom: string[] = [];
  if (!eicStops.length && !input.eicPreviouslyDisallowed) {
    const group = fs === "mfj" ? "mfj" : "other";
    const eicCap = EIC.completedPhaseOut[group][Math.min(3, eicKids.length)];
    if (wages === 0 || wages >= eicCap || agi >= eicCap) {
      eicHow =
        wages === 0
          ? "No earned income"
          : `Income is at or over $${eicCap.toLocaleString("en-US")}, where the credit has run out`;
    } else {
      const w = eicWorksheetA({
        group,
        kids: eicKids.length,
        earnedIncome: wages,
        agi,
      });
      eicAmount = w.credit;
      eicFrom.push("1040.1z", "1040.11");
      eicHow =
        w.fromAgi === null
          ? `EIC Table lookup for earned income $${wages.toLocaleString("en-US")}, ${group === "mfj" ? "married filing jointly" : "single, head of household or surviving spouse"}, ${Math.min(3, eicKids.length)} qualifying child${eicKids.length === 1 ? "" : "ren"}`
          : `The smaller of the EIC Table credit for earned income ($${w.fromEarned.toLocaleString("en-US")}) and for AGI ($${w.fromAgi.toLocaleString("en-US")})`;
    }
  }
  const l27 = put(
    "1040.27",
    "Form 1040",
    "27",
    "Earned income credit",
    eicAmount,
    eicHow,
    eicFrom,
    "2024 Form 1040 instructions, EIC Worksheet A and the EIC Table",
  );
  const l28 = put(
    "1040.28",
    "Form 1040",
    "28",
    "Additional child tax credit",
    actc,
    "Schedule 8812, line 27",
    ["8812.27"],
  );
  const l32 = put(
    "1040.32",
    "Form 1040",
    "32",
    "Other payments and refundable credits",
    l27 + l28,
    "Lines 27 + 28 (29 and 31 are zero)",
    ["1040.27", "1040.28"],
  );
  const l33 = put(
    "1040.33",
    "Form 1040",
    "33",
    "Total payments",
    w25d + l26 + l32,
    "Lines 25d + 26 + 32",
    ["1040.25d", "1040.26", "1040.32"],
  );
  const overpaid = put(
    "1040.34",
    "Form 1040",
    "34",
    "Amount overpaid",
    Math.max(0, l33 - totalTax),
    "Line 33 minus line 24, if more than zero",
    ["1040.33", "1040.24"],
  );
  const refund = put(
    "1040.35a",
    "Form 1040",
    "35a",
    "Refund",
    overpaid,
    "All of the overpayment (none applied to next year)",
    ["1040.34"],
  );
  const owed = put(
    "1040.37",
    "Form 1040",
    "37",
    "Amount you owe",
    Math.max(0, totalTax - l33),
    "Line 24 minus line 33, if more than zero",
    ["1040.24", "1040.33"],
  );

  // --- things the engine can't settle, said out loud ---------------------------------------------
  if (wages === 0 && agi > 0)
    issues.push({
      kind: "warning",
      message:
        "No wages entered; check that no other income (self-employment, retirement) is missing.",
    });

  const status: ReturnResult["status"] = issues.some(
    (i) =>
      i.kind === "missing" ||
      (i.kind === "warning" && /Form 8862/.test(i.message)),
  )
    ? "incomplete"
    : "complete";
  return {
    year: YEAR,
    status,
    issues,
    lines: Object.fromEntries(L.lines),
    refund,
    owed,
    explain: (id) => L.explain(id),
  };
}
