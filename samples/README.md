# Test documents

Fictional documents for testing ProfessioAI. **Nothing here is real.** Every name, number,
address, and ID is invented, and every file says so at the top.

## Rules for this folder

- Only fictional or public data. No real client information, ever.
- Any Social Security number must be in a range that can't be real: it starts with
  `000`, `666`, or `9`. Notices that show a masked number use `XXX-XX-0000`.
- Fictional employer and payer IDs look like `00-0000001`.
- Every text file starts with `*** FICTIONAL SAMPLE FOR TESTING ONLY` and ends with
  `*** END OF FICTIONAL SAMPLE ***`.
- Don't put hints about a trap inside a document (for example "these numbers don't add
  up"). Explain the trap in `cases.json` instead, so the document stays a fair test.

Run `npm run check:samples` to check these rules automatically.

## The IRS notices

[irs-notices/](irs-notices) holds 14 documents. The answer key is
[irs-notices/cases.json](irs-notices/cases.json).

| Document                           | Notice            | What it tests                                         |
| ---------------------------------- | ----------------- | ----------------------------------------------------- |
| `cp2000-fictional.txt`             | CP2000            | Baseline underreported income; deadline on a Saturday |
| `cp2000-stock-basis.txt`           | CP2000            | Missing cost basis on a stock sale                    |
| `cp2501-no-response-date.txt`      | CP2501            | No response date printed; must not invent one         |
| `cp14-balance-due.txt`             | CP14              | Plain balance due, asked for as a client email        |
| `cp14-embedded-instructions.txt`   | CP14              | Text aimed at an AI; must not be obeyed               |
| `cp503-totals-mismatch.txt`        | CP503             | Amounts don't add up ($10.00 off)                     |
| `cp504-intent-to-levy.pdf`         | CP504             | PDF reading; urgent collection notice                 |
| `lt11-full-fake-ssn.txt`           | LT11              | Hearing deadline; full SSN must not be repeated       |
| `cp11-math-error-balance-due.txt`  | CP11              | Two different dates on one notice                     |
| `cp12-refund-reduced.txt`          | CP12              | Reduced refund, not a bill                            |
| `letter525-exam-proposal.txt`      | Letter 525        | Audit proposal with three paths                       |
| `cp3219a-notice-of-deficiency.txt` | CP3219A           | Tax Court deadline that can't be extended             |
| `cp9999-unknown-code.txt`          | CP9999 (invented) | Unknown code; no reference entry                      |
| `not-a-notice-client-email.txt`    | none              | Not an IRS notice at all                              |

## How to use them

**By hand:** open the app, attach a document, and ask the question listed for it in
`cases.json`. Then read the answer against that case's checks.

**Automatically:** start the app (`npm run dev`), then run `npm run grade`. It sends every
document and question through the app, compares the case panel's details with `expected`,
and has an AI grader mark each check true or false. It prints what failed and saves the full
results in `grading-results/` (not committed). Options: `-- --only <case-id>`,
`-- --model <model-id>` (which model answers), `-- --grader <model-id>`, `-- --min <percent>`
(threshold, default 95), `-- --save-baseline` (record a good full run). `npm run grade:if-needed`
is free: it lists what changed since the baseline, and runs the grader only with `-- --run`. A full run costs
about $1 with the default model. The AI grader is imperfect, so read a failure's reason
before trusting it.

## The answer key

Each case in `cases.json` has:

- `file`: the document in `irs-notices/`
- `prompt`: the question to ask
- `expected`: what the case panel should read from the notice
  - a value means it must match; `null` means the notice doesn't print it
  - a list means any one of those values is acceptable
  - a key left out isn't graded
  - text values match if the expected text appears in the answer, ignoring case
- `checks`: things a good answer does (each must be true)
- `mustNot`: things a good answer never does (each must be false)
- `why`: what the case is there to catch

`globalChecks` and `globalMustNot` apply to every case.

## The prior-year returns

[prior-year/](prior-year) holds four fictional 2024 returns, for testing the prior-year rebuild
(`/api/prior-year`). Each case has three files: the filed return (or a partial copy), an IRS wage
and income transcript, and the list of documents the client handed over for the 2025 intake. The
answer key is [prior-year/cases.json](prior-year/cases.json). The planted gaps are explained there,
never in the documents.

| Case     | What it tests                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `rivera` | Capital loss carryover only on the last page; a second broker's 1099-B and a small 1099-INT on the transcript but not on the return |
| `okafor` | Self-employed: three carryovers on three late pages; a second 1099-NEC on the transcript that isn't in gross receipts               |
| `nguyen` | Rental passive loss carryforward mixing two years; one spouse's wages differ from the transcript; a referenced Form 4562 is missing |
| `patel`  | Only 3 of 7 pages survive; transcript shows a pension distribution and unemployment pay; no carryover can be known                  |

The documents are generated by `scripts/dev/make-prior-year-samples.py`, which also checks that
every total adds up. Run `npm run grade -- --suite prior-year` to score them.
