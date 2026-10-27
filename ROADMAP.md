# ProfessioAI Roadmap

> Working draft. Every part of this can change as the product takes shape.

## What ProfessioAI is

A conversational assistant for tax consulting and accounting work. It produces fast
first drafts of documents, research, and data analyses for a professional to review.
It is sold per seat to businesses, but stays simple enough for solo consultants and
small tax preparation practices.

Core pieces:

- **Chat**: talk to the assistant, with answers that stream in as they're written.
- **Documents**: upload files (starting with PDFs) and ask questions about them.
- **API linking**: the assistant can call outside services (accounting software,
  tax data sources, client files) through a standard tool pattern.

## Current status

- [x] GitHub repo set up (`ProfessioAI/professio-ai`)
- [x] README and .gitignore
- [x] Phase 1: Working chat app
- [x] Phase 2: Test data
- [ ] Phase 3: Automated grading (runner built, thresholds and CI still to do)

## Phases

### Phase 1: Working chat app

- [x] Next.js + TypeScript project
- [x] Chat page with streaming replies (Claude API)
- [x] System prompt for the tax/accounting role
- [x] Disclaimer shown in the app: outputs are drafts for professional review,
      not tax or legal advice
- [x] PDF and .txt upload, with questions about the uploaded document
- [x] One example API link (tool) as the pattern for future integrations
      (`lookup_irs_notice`)
- [x] README updated with setup steps
- [x] First fictional test document (`samples/irs-notices/cp2000-fictional.txt`)
- [x] First live run with an API key

**First focus:** IRS notices (e.g. CP2000 letters, audit letters). Common for firms
of every size, clearly structured, and easy to create fictional versions of.

### Phase 2: Test data

Use **only fictional or public data** until Phase 5 is complete.

- [x] 10–20 test documents: 14 fictional IRS notices in `samples/irs-notices/`, including
      traps (a missing date, totals that don't add up, hidden instructions, an unknown
      notice code, and a document that isn't a notice)
  - Fictional documents generated with an AI model (fake names, entities, numbers)
  - Public sources, not used yet: U.S. Tax Court opinions, SEC EDGAR filings,
    IRS VITA training workbooks (Pub 4491 and related), IRS e-file test scenarios
- [x] Fake SSNs only from ranges that can never be real (starting `000`, `666`, or `9xx`),
      enforced by `npm run check:samples`
- [x] A grading checklist per document (e.g. "cites the right code section",
      "flags the response deadline", "doesn't make up numbers"), in
      `samples/irs-notices/cases.json`

**Baseline finding (fixed in Phase 3):** on an unfamiliar notice code, the assistant didn't
suggest confirming the notice is genuine. The system prompt now asks for that, and the case passes.

### Phase 3: Automated grading

- [x] One command (`npm run grade`) runs every test document through the app and scores the
      answers against its checklist (first full run: 96.7% of checks, was 88.4% before the
      prompt fixes)
- [ ] Run it after every prompt or code change to catch regressions (manual for now; a
      pass-rate threshold and CI run are still to do)

### Phase 4: Accounts and storage

- [ ] Sign-in
- [x] Saved conversations in the browser (IndexedDB): folders, icons, rename, description, and a
      switch to turn saving off (`src/lib/library.ts`)
- [ ] Saved chats and documents on the server (Supabase), so they follow the user between devices
- [x] In-app usage meter: estimated cost per reply, per conversation, per day, and all
      time, kept in the browser (`src/lib/usage.ts`, prices last checked 2026-10-06)
- [x] User settings, saved in the browser (`src/lib/settings.ts`): style (Classic or Glass),
      theme, accent (presets or a color wheel), fully custom colors (color wheels or JSON), seven
      fonts, text size, spacing, width, motion; LLM model (Opus 5.5, Sonnet 5.5, Haiku 5.5,
      Fable 5.1); send key, scrolling, what to show, answer detail and tone; notice reading,
      details panel, deadline warning, date format; practice details; usage and export options
- [ ] Move settings (including custom themes) to the user's account, so they follow the user between devices
- [ ] Per-user usage tracking on the server (needed for seat licensing and cost control)

### Phase 5: Legal and privacy review (before any real client data)

- [ ] **IRC §7216**: rules on how tax preparers may use or share client tax
      information, including possible client consent for third-party AI services
- [ ] **FTC Safeguards Rule (GLBA)**: tax preparers must keep a written information
      security plan (see IRS Pub 4557); the app must fit into customers' plans
- [ ] Data retention: confirm current AI provider terms, consider zero data
      retention, and review our own database, logs, and file storage
- [ ] **TaxWise access**: check the Wolters Kluwer license and terms for automated access, and ask
      what import/export or partner integration they offer (we know of no public API)
- [ ] **Sending return data to an AI vendor**: confirm whether §7216 needs client consent or an
      exception covers it, and what a consent form should say
- [ ] Final disclaimer wording
- [ ] Consult an attorney familiar with tax practice

### Phase 6: Pricing, billing, and pilot

- [ ] Choose a pricing model (seat-based is the current direction; seats plus usage
      credits is a possible hybrid)
- [ ] Billing (e.g. Stripe)
- [ ] Credit balance per user, shown in the app next to the usage meter
- [ ] In-app top-up with Stripe Checkout (test mode first), crediting the balance when the
      payment completes
- [ ] Low-balance warning, and a stop (with a prompt to top up) when credits run out
- [ ] Pilot with a few friendly users, using test data only until Phase 5 is done

### Phase 7: Data scrubbing and privacy

Needed before any real client file reaches the AI model or storage.

- [ ] Detection for SSN/ITIN, EIN, names, addresses, DOB, phone, email, and
      bank/routing numbers
- [ ] Run Presidio (open source) on our own servers, with custom detectors for tax IDs, EINs,
      and notice and account numbers
- [ ] Tokenization: replace each identifier with a token (`[SSN_1]`) before the AI sees a file, keep
      the real values in a protected local vault, and swap them back in only at data entry
- [ ] Scrub runs on every upload and email attachment before anything reaches the AI
      model or storage
- [ ] Fail closed: low-confidence or unreadable files are held for human review instead
      of passing through
- [ ] Human review queue for flagged items
- [ ] Scrubbing also covers chat logs, prompts, and error logs
- [ ] Scrub accuracy test set built from fictional documents with fake SSNs
- [ ] Per-file scrub report and audit trail
- [ ] Re-run scrub checks after every change to the detection rules

### Phase 8: Prior-year rebuild
For when another preparer filed last year and the records are scattered or incomplete. Read-only
first: it needs no TaxWise link. Fictional returns only until Phases 5 and 7 are done.
- [ ] Fictional 2024 returns with deliberately missing or conflicting pieces, and a grading
      checklist for each (same approach as the notice test set)
- [ ] Read a filed return (PDF) into a structured profile, with the page and line behind every value
- [ ] IRS transcript support: Return, Account, and Wage & Income transcripts, with the
      authorization steps (Forms 8821 and 2848) laid out for the preparer
- [ ] Carryover schedule: capital losses, depreciation and basis, passive and net operating
      loss carryforwards, nondeductible IRA basis, charitable carryovers, overpayment applied,
      state carryovers
- [ ] Gap and conflict report: documents missing against the return and the transcripts, and
      where they disagree
- [ ] Draft client email requesting the missing items
- [ ] Unknowns stay marked `[CONFIRM]` for the preparer; nothing is guessed
- [ ] Flag a prior return that looks wrong, so the preparer can decide about amending
- [ ] Extraction accuracy added to the automated grading from Phase 3
- [ ] Export a worksheet or import file the preparer loads into TaxWise (before any agent entry)

### Phase 9: Email linking

- [ ] Connect a mailbox through secure sign-in (OAuth)
- [ ] Agent checks the inbox and pulls in attachments, scrubbed on arrival
- [ ] Agent drafts replies and sends files back
- [ ] Director approval step before any outgoing email
- [ ] Director can add files directly through an upload page
- [ ] Sender allow-list and client matching
- [ ] Audit log of every email read, sent, and attached

### Phase 10: TaxWise data entry agent

- [ ] Sandboxed computer environment where the agent controls keyboard and mouse in
      TaxWise
- [ ] Map TaxWise screens and fields for the first return types
- [ ] Documented skill for each data entry task (screen, field, source document, check)
- [ ] Agent enters data from scrubbed source documents on fictional clients only
- [ ] Verification pass compares entered values against the source document
- [ ] Human review checkpoint before anything is finalized or filed
- [ ] Screen recording and action log of every agent session
- [ ] Emergency stop and permission limits
- [ ] Accuracy scoring added to the automated grading from Phase 3

### Phase 11: Skill trees and client-approved datasets

- [ ] Documented skill tree format (skills, sub-skills, examples, grading checklists)
- [ ] Skill trees for IRS notices and the other first document types
- [ ] Dataset builder for packages of 100 to 10,000 scrubbed files
- [ ] Client consent flow: per-client, per-dataset opt-in that can be withdrawn
- [ ] De-identification testing before any dataset leaves the system
- [ ] Provenance record for every file in a dataset
- [ ] Legal review of consent and IRC 7216 for dataset sales
- [ ] Buyer terms and licensing for AI labs and financial firms
- [ ] Revenue-share tracking and payouts to clients

## Suggested build order

Phases are numbered by topic, not strictly by order. Suggested order:

1. Phases 2 and 3 (test data and grading): cheap, and they make every later change measurable.
2. Phase 5 (legal and privacy review): start the attorney conversation early, in
   parallel with building, because it can take weeks and shapes Phases 8 to 11.
3. Phase 4 (accounts and storage).
4. Phase 7 (data scrubbing), **before any pilot that touches real client files**.
5. Phase 6 (pricing, billing, and pilot).
6. Phase 8 (prior-year rebuild) can start read-only on fictional returns as soon as Phase 3 is
   solid. Phases 9, 10, and 11 are each gated on Phases 5 and 7.

## Deferred for now

- **No-code tools** (Bubble, Make.com): not needed since the app is built in code.

_Automatic scrubbing (e.g. Microsoft Presidio) used to be deferred. Real client files
now make it Phase 7, and automated scrubbers can miss things, so it fails closed with
human review._

## Open questions

- Which document types come after IRS notices?
- Which outside services should API linking connect to first?
- Seat pricing and usage limits
