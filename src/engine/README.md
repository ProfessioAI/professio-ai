# Tax engine (tax year 2024)

Works out a federal Form 1040 from plain inputs, with **no AI involved**. Every number comes from a
rule written in this folder, and every line records how it was reached, so the app can answer "why
is this line $X?" and show where each input came from.

```ts
import { computeReturn } from "@/engine/compute";

const result = computeReturn({
  filingStatus: "single",
  primary: { age65OrOlder: false, blind: false, ageAtYearEnd: 35 },
  w2s: [{ wages: 50_000, federalWithheld: 5_000 }],
});
result.refund; // 969
result.explain("1040.16"); // the tax line and everything it came from
```

On screen: the **Return** page in the app (`src/components/chat/ReturnView.tsx`).

## What it covers

Any filing status; W-2 wages; taxable interest; ordinary dividends; unemployment pay; the standard
deduction (age, blindness, and dependent rules); the Tax Table and rate schedules; the child tax
credit, credit for other dependents, and additional child tax credit (Schedule 8812); the earned
income credit (Worksheet A, for filers without self-employment income); withholding and estimated
payments; refund or amount owed.

## What it refuses to guess

Itemized deductions, qualified dividends and capital gains, self-employment, Social Security
benefits, retirement distributions, other credits, state returns, and Form 8862. Anything like that
makes the result `unsupported` (nothing is computed) or `incomplete` (computed, but something that
could change the answer is missing; see `issues`). It never fills a gap with a guess.

## How it is checked

`npm run engine:test` (free, no network):

- **Every row of the IRS 2024 Tax Table** (2,062 rows, all four filing-status columns, three
  incomes per row) and **every row of the IRS 2024 EIC Table** (1,337 rows, all eight columns).
  Both were read from the IRS booklet "Tax and Earned Income Credit Tables" (2024), a public U.S.
  government document, into `fixtures/`. This is an independent check: the numbers come from the
  IRS, not from this code.
- Hand-worked whole returns, where each expected number is calculated in a comment from the rules.
- Refusal cases: what must be reported as unsupported or incomplete.

Not yet checked against an independent source: the Schedule 8812 phase-outs and refundable-credit
math, and whole returns. The IRS's own e-file test scenarios (ATS) turned out to give **inputs only,
not expected results**, so they can't serve as an answer key. Candidates for that: the IRS's
open-source Direct File (CC0, archived, written for tax year 2024) and the VITA training problems
with answers.

## Adding a year

Copy `years/2024.ts` to the new year, update every number from that year's Rev. Proc. and form
instructions, add the new Tax Table and EIC Table fixtures, and make the tests pass.
