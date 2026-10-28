import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeReturn } from "./compute";
import { readFileSync } from "node:fs";
import { eicTableCredit } from "./eic";
import { incomeTax, scheduleTax, taxTableRow, taxTableTax } from "./tax";

// Every expected number below is worked out by hand in the comment next to it, from the 2024 rules
// (not by running the engine), so a wrong rule shows up as a failing test.

const kid = (age = 5) => ({
  ageAtYearEnd: age,
  hasValidSsn: true,
  isQualifyingChild: true,
});
const base = {
  primary: { age65OrOlder: false, blind: false, ageAtYearEnd: 35 },
};

describe("rate schedule", () => {
  it("is exact at the bracket edges", () => {
    assert.equal(scheduleTax(11_600, "single"), 1_160); // 10% of 11,600
    assert.equal(scheduleTax(47_150, "single"), 5_426); // 1,160 + 12% of 35,550 (4,266)
    assert.equal(scheduleTax(100_525, "single"), 17_168.5); // 5,426 + 22% of 53,375 (11,742.50)
    assert.equal(scheduleTax(94_300, "mfj"), 10_852); // 2,320 + 12% of 71,100 (8,532)
    assert.equal(scheduleTax(16_550, "hoh"), 1_655); // 10% of 16,550
    assert.equal(scheduleTax(63_100, "hoh"), 7_241); // 1,655 + 12% of 46,550 (5,586)
  });
});

describe("tax table", () => {
  it("finds the right row", () => {
    assert.deepEqual(taxTableRow(4), [0, 5]);
    assert.deepEqual(taxTableRow(12), [5, 15]);
    assert.deepEqual(taxTableRow(20), [15, 25]);
    assert.deepEqual(taxTableRow(30), [25, 50]);
    assert.deepEqual(taxTableRow(2_999), [2_975, 3_000]);
    assert.deepEqual(taxTableRow(3_000), [3_000, 3_050]);
    assert.deepEqual(taxTableRow(50_049), [50_000, 50_050]);
  });
  it("taxes the middle of the row", () => {
    assert.equal(taxTableTax(4, "single"), 0); // under $5 the table shows nothing
    assert.equal(taxTableTax(10, "single"), 1); // 10% of 10
    assert.equal(taxTableTax(20, "single"), 2); // 10% of 20
    assert.equal(taxTableTax(30, "single"), 4); // 10% of 37.50 = 3.75, rounds to 4
    assert.equal(taxTableTax(2_999, "single"), 299); // 10% of 2,987.50 = 298.75
    assert.equal(taxTableTax(3_000, "single"), 303); // 10% of 3,025 = 302.50, half rounds up
    assert.equal(taxTableTax(50_000, "single"), 6_059); // 5,426 + 22% of 2,875 (632.50) = 6,058.50
  });
  it("uses the schedule from $100,000", () => {
    assert.equal(incomeTax(99_999, "single").method, "tax-table");
    assert.equal(
      incomeTax(100_000, "single").method,
      "tax-computation-worksheet",
    );
    assert.equal(incomeTax(0, "single").tax, 0);
  });
});

describe("standard deduction", () => {
  const std = (input: object) =>
    computeReturn({
      filingStatus: "single",
      ...base,
      w2s: [{ wages: 50_000 }],
      ...input,
    }).lines["1040.12"].amount;
  it("by filing status", () => {
    assert.equal(std({}), 14_600);
    assert.equal(
      std({
        filingStatus: "mfj",
        spouse: { age65OrOlder: false, blind: false },
      }),
      29_200,
    );
    assert.equal(std({ filingStatus: "hoh" }), 21_900);
  });
  it("adds for age and blindness", () => {
    assert.equal(
      std({ primary: { age65OrOlder: true, blind: false } }),
      16_550,
    ); // 14,600 + 1,950
    assert.equal(
      std({
        filingStatus: "hoh",
        primary: { age65OrOlder: false, blind: true },
      }),
      23_850,
    ); // 21,900 + 1,950
    assert.equal(
      std({
        filingStatus: "mfj",
        primary: { age65OrOlder: true, blind: true },
        spouse: { age65OrOlder: true, blind: true },
      }),
      35_400, // 29,200 + 4 × 1,550
    );
  });
  it("is limited for someone who can be claimed as a dependent", () => {
    assert.equal(
      std({ canBeClaimedAsDependent: true, w2s: [{ wages: 5_000 }] }),
      5_450,
    ); // earned 5,000 + 450
    assert.equal(std({ canBeClaimedAsDependent: true, w2s: [] }), 1_300); // the floor
    assert.equal(
      std({ canBeClaimedAsDependent: true, w2s: [{ wages: 40_000 }] }),
      14_600,
    ); // never more than regular
  });
});

describe("whole returns", () => {
  it("single filer with wages and a little interest", () => {
    // income 50,000 + 100 = 50,100; minus 14,600 = 35,500 taxable. Table row 35,500–35,550, middle 35,525:
    // 1,160 + 12% × (35,525 − 11,600 = 23,925 → 2,871) = 4,031. Withheld 5,000, so 969 back.
    const r = computeReturn({
      filingStatus: "single",
      ...base,
      w2s: [{ wages: 50_000, federalWithheld: 5_000 }],
      interest: [{ taxableInterest: 100 }],
    });
    assert.equal(r.status, "complete");
    assert.equal(r.lines["1040.11"].amount, 50_100);
    assert.equal(r.lines["1040.15"].amount, 35_500);
    assert.equal(r.lines["1040.16"].amount, 4_031);
    assert.equal(r.refund, 969);
    assert.equal(r.owed, 0);
  });

  it("married couple with two children", () => {
    // 70,000 − 29,200 = 40,800. Row 40,800–40,850, middle 40,825: 2,320 + 12% × 17,625 (2,115) = 4,435.
    // Two children = 4,000 credit, all used: tax 435. Withheld 6,000: refund 5,565.
    const r = computeReturn({
      filingStatus: "mfj",
      ...base,
      spouse: { age65OrOlder: false, blind: false },
      w2s: [
        { wages: 40_000, federalWithheld: 3_500 },
        { wages: 30_000, federalWithheld: 2_500 },
      ],
      dependents: [kid(5), kid(8)],
    });
    assert.equal(r.lines["1040.16"].amount, 4_435);
    assert.equal(r.lines["1040.19"].amount, 4_000);
    assert.equal(r.lines["1040.24"].amount, 435);
    assert.equal(r.refund, 5_565);
  });

  it("head of household with one child and low income gets both refundable credits", () => {
    // 20,000 − 21,900 → taxable 0, tax 0. Child credit 2,000, none usable. Additional child tax credit: the smaller of
    // 2,000 unused, 1,700 per child, and 15% × (20,000 − 2,500) = 2,625 → 1,700.
    // Earned income credit: one child, earned income 20,000 is between 12,390 and 22,720, so the full 4,213.
    // Refund = 1,000 withheld + 1,700 + 4,213 = 6,913.
    const r = computeReturn({
      filingStatus: "hoh",
      ...base,
      w2s: [{ wages: 20_000, federalWithheld: 1_000 }],
      dependents: [kid(10)],
    });
    assert.equal(r.lines["1040.15"].amount, 0);
    assert.equal(r.lines["1040.19"].amount, 0);
    assert.equal(r.lines["1040.28"].amount, 1_700);
    assert.equal(r.lines["1040.27"].amount, 4_213);
    assert.equal(r.refund, 6_913);
    assert.equal(r.status, "complete");
  });

  it("shrinks the child credit for high income", () => {
    // Income 205,500 is 5,500 over 200,000: 6 steps of $1,000 × $50 = 300 off 2,000 → 1,700.
    // Taxable 205,500 − 14,600 = 190,900: 17,168.50 + 24% × 90,375 (21,690) = 38,858.50 → 38,859. Less 1,700 = 37,159.
    const r = computeReturn({
      filingStatus: "single",
      ...base,
      w2s: [{ wages: 205_500, federalWithheld: 40_000 }],
      dependents: [kid(5)],
    });
    assert.equal(r.lines["8812.11"].amount, 300);
    assert.equal(r.lines["1040.16"].amount, 38_859);
    assert.equal(r.lines["1040.19"].amount, 1_700);
    assert.equal(r.lines["1040.24"].amount, 37_159);
    assert.equal(r.refund, 2_841);
  });

  it("gives $500 for an older dependent", () => {
    // 60,000 − 14,600 = 45,400; row 45,400–45,450, middle 45,425: 1,160 + 12% × 33,825 (4,059) = 5,219. Less 500 = 4,719.
    const r = computeReturn({
      filingStatus: "single",
      ...base,
      w2s: [{ wages: 60_000, federalWithheld: 7_000 }],
      dependents: [
        { ageAtYearEnd: 18, hasValidSsn: true, isQualifyingChild: true },
      ],
    });
    assert.equal(r.lines["1040.19"].amount, 500);
    assert.equal(r.lines["1040.24"].amount, 4_719);
    assert.equal(r.refund, 2_281);
  });

  it("treats unemployment pay as income with its own withholding", () => {
    // 8,000 income is under the 14,600 deduction: no tax. The 800 withheld all comes back.
    const r = computeReturn({
      filingStatus: "single",
      ...base,
      unemployment: [{ amount: 8_000, federalWithheld: 800 }],
    });
    assert.equal(r.lines["1040.8"].amount, 8_000);
    assert.equal(r.lines["1040.24"].amount, 0);
    assert.equal(r.refund, 800);
  });

  it("owes when too little was withheld", () => {
    // 80,000 − 14,600 = 65,400: row 65,400–65,450, middle 65,425: 5,426 + 22% × 18,275 (4,020.50) = 9,446.50 → 9,447.
    const r = computeReturn({
      filingStatus: "single",
      ...base,
      w2s: [{ wages: 80_000, federalWithheld: 8_000 }],
    });
    assert.equal(r.lines["1040.16"].amount, 9_447);
    assert.equal(r.owed, 1_447);
    assert.equal(r.refund, 0);
  });
});

describe("what it will not guess", () => {
  it("refuses itemized deductions", () => {
    const r = computeReturn({
      filingStatus: "single",
      ...base,
      wantsToItemize: true,
      w2s: [{ wages: 50_000 }],
    });
    assert.equal(r.status, "unsupported");
    assert.deepEqual(r.lines, {});
  });
  it("refuses qualified dividends", () => {
    const r = computeReturn({
      filingStatus: "single",
      ...base,
      dividends: [{ ordinaryDividends: 500, qualifiedDividends: 400 }],
    });
    assert.equal(r.status, "unsupported");
  });
  it("asks for the spouse on a joint return", () => {
    const r = computeReturn({
      filingStatus: "mfj",
      ...base,
      w2s: [{ wages: 50_000 }],
    });
    assert.equal(r.status, "incomplete");
    assert.ok(r.issues.some((i) => i.kind === "missing"));
  });
  it("rejects nonsense", () => {
    const r = computeReturn({
      filingStatus: "single",
      ...base,
      w2s: [{ wages: -5 }],
    });
    assert.equal(r.status, "incomplete");
  });
});

describe("explanations", () => {
  it("traces a line back through what it came from", () => {
    const r = computeReturn({
      filingStatus: "single",
      ...base,
      w2s: [{ wages: 50_000, federalWithheld: 5_000 }],
    });
    const ids = r.explain("1040.15").map((l) => l.id);
    assert.ok(ids.includes("1040.11"));
    assert.ok(ids.includes("1040.14"));
    assert.ok(ids.includes("1040.1a"));
  });
});

describe("against the IRS's own 2024 Tax Table", () => {
  // Every row of the table in the IRS booklet "Tax and Earned Income Credit Tables" (2024), read
  // from the PDF: [at least, less than, single, married filing jointly, married filing separately, head of household].
  const rows: number[][] = JSON.parse(
    readFileSync(
      new URL("./fixtures/tax-table-2024.json", import.meta.url),
      "utf8",
    ),
  );
  const columns = ["single", "mfj", "mfs", "hoh"] as const;

  it("has the whole table", () => {
    assert.equal(rows.length, 2_062); // 0-5, 5-15, 15-25, then 2,059 rows up to $100,000
  });

  it("matches every row, for every filing status, at the start, middle, and end of the row", () => {
    const wrong: string[] = [];
    for (const [low, high, ...values] of rows) {
      columns.forEach((status, i) => {
        for (const income of [low, Math.floor((low + high) / 2), high - 1]) {
          const got = taxTableTax(income, status);
          if (got !== values[i])
            wrong.push(
              `${status} $${income}: engine ${got}, IRS table ${values[i]}`,
            );
        }
      });
    }
    assert.deepEqual(wrong.slice(0, 10), [], `${wrong.length} differences`);
  });
});

describe("against the IRS's own 2024 EIC Table", () => {
  // Every row of the Earned Income Credit Table in the IRS booklet (2024), read from the PDF:
  // [at least, less than, single/HOH/QSS with 0, 1, 2, 3 children, married filing jointly with 0, 1, 2, 3].
  const rows: number[][] = JSON.parse(
    readFileSync(
      new URL("./fixtures/eic-table-2024.json", import.meta.url),
      "utf8",
    ),
  );
  it("has the whole table", () => {
    assert.equal(rows.length, 1_337); // $1-50, then $50 rows up to $66,800
  });
  it("matches every row, for every column", () => {
    const wrong: string[] = [];
    for (const [low, high, ...credits] of rows) {
      for (const income of [low, Math.floor((low + high) / 2), high - 1]) {
        credits.forEach((want, i) => {
          const group = i < 4 ? "other" : "mfj";
          const kids = (i % 4) as 0 | 1 | 2 | 3;
          const got = eicTableCredit(income, group, kids);
          if (got !== want)
            wrong.push(
              `${group} ${kids} children, $${income}: engine ${got}, IRS table ${want}`,
            );
        });
      }
    }
    assert.deepEqual(wrong.slice(0, 10), [], `${wrong.length} differences`);
  });
  it("is zero past the end of the table", () => {
    assert.equal(eicTableCredit(66_800, "mfj", 3), 0);
    assert.equal(eicTableCredit(0, "other", 1), 0);
  });
});

describe("earned income credit", () => {
  const eicRows: number[][] = JSON.parse(
    readFileSync(
      new URL("./fixtures/eic-table-2024.json", import.meta.url),
      "utf8",
    ),
  );
  /** The credit straight from the IRS table in the fixture: [single 0..3 children, married 0..3 children]. */
  const table = (amount: number, column: number) => {
    const row = eicRows.find(([lo, hi]) => amount >= lo && amount < hi);
    return row ? row[2 + column] : 0;
  };
  const eic = (input: object) =>
    computeReturn({ filingStatus: "single", ...base, ...input }).lines[
      "1040.27"
    ].amount;

  it("gives the table amount for a single filer with no children aged 25 or older", () => {
    assert.equal(eic({ w2s: [{ wages: 9_000 }] }), table(9_000, 0));
    assert.equal(eic({ w2s: [{ wages: 9_000 }] }), 632);
  });
  it("is not for a childless filer under 25 or 65 and over", () => {
    assert.equal(
      eic({
        primary: { age65OrOlder: false, blind: false, ageAtYearEnd: 24 },
        w2s: [{ wages: 9_000 }],
      }),
      0,
    );
    assert.equal(
      eic({
        primary: { age65OrOlder: true, blind: false, ageAtYearEnd: 65 },
        w2s: [{ wages: 9_000 }],
      }),
      0,
    );
    assert.equal(
      eic({
        primary: { age65OrOlder: false, blind: false, ageAtYearEnd: 25 },
        w2s: [{ wages: 9_000 }],
      }),
      632,
    );
  });
  it("needs the age when there are no children", () => {
    const r = computeReturn({
      filingStatus: "single",
      primary: { age65OrOlder: false, blind: false },
      w2s: [{ wages: 9_000 }],
    });
    assert.equal(r.status, "incomplete");
    assert.ok(r.issues.some((i) => /age/.test(i.message)));
  });
  it("uses the smaller of the earned income and AGI lookups when AGI is higher", () => {
    // Earned 25,000, interest 3,000 → AGI 28,000. One child, single: look up both in the table, take the smaller.
    const got = eic({
      w2s: [{ wages: 25_000 }],
      interest: [{ taxableInterest: 3_000 }],
      dependents: [kid(7)],
    });
    assert.equal(got, Math.min(table(25_000, 1), table(28_000, 1)));
    assert.ok(table(28_000, 1) < table(25_000, 1));
  });
  it("does not apply with too much investment income, as a dependent, or filing separately", () => {
    const wages = [{ wages: 9_000 }];
    assert.equal(
      eic({ w2s: wages, interest: [{ taxableInterest: 11_601 }] }),
      0,
    );
    assert.equal(eic({ w2s: wages, canBeClaimedAsDependent: true }), 0);
    assert.equal(eic({ w2s: wages, filingStatus: "mfs" }), 0);
  });
  it("uses the married column for a joint return", () => {
    const got = eic({
      filingStatus: "mfj",
      spouse: { age65OrOlder: false, blind: false, ageAtYearEnd: 30 },
      w2s: [{ wages: 28_000 }],
      dependents: [kid(3), kid(6)],
    });
    assert.equal(got, table(28_000, 6)); // married, two children
    assert.equal(got, 6_960); // under the 29,640 phase-out start, so the maximum
  });
  it("stops at the end of the table", () => {
    assert.equal(
      eic({ w2s: [{ wages: 70_000 }], dependents: [kid(3), kid(6), kid(9)] }),
      0,
    );
  });
});
