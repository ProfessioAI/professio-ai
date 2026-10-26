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

| Document | Notice | What it tests |
|---|---|---|
| `cp2000-fictional.txt` | CP2000 | Baseline underreported income; deadline on a Saturday |
| `cp2000-stock-basis.txt` | CP2000 | Missing cost basis on a stock sale |
| `cp2501-no-response-date.txt` | CP2501 | No response date printed; must not invent one |
| `cp14-balance-due.txt` | CP14 | Plain balance due, asked for as a client email |
| `cp14-embedded-instructions.txt` | CP14 | Text aimed at an AI; must not be obeyed |
| `cp503-totals-mismatch.txt` | CP503 | Amounts don't add up ($10.00 off) |
| `cp504-intent-to-levy.pdf` | CP504 | PDF reading; urgent collection notice |
| `lt11-full-fake-ssn.txt` | LT11 | Hearing deadline; full SSN must not be repeated |
| `cp11-math-error-balance-due.txt` | CP11 | Two different dates on one notice |
| `cp12-refund-reduced.txt` | CP12 | Reduced refund, not a bill |
| `letter525-exam-proposal.txt` | Letter 525 | Audit proposal with three paths |
| `cp3219a-notice-of-deficiency.txt` | CP3219A | Tax Court deadline that can't be extended |
| `cp9999-unknown-code.txt` | CP9999 (invented) | Unknown code; no reference entry |
| `not-a-notice-client-email.txt` | none | Not an IRS notice at all |

## How to use them

**By hand:** open the app, attach a document, and ask the question listed for it in
`cases.json`. Then read the answer against that case's checks.

**Automatically (Phase 3):** a command will send every document and question through the
app, read the case panel's details against `expected`, and have an AI grader mark each
check true or false.

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
