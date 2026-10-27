# ProfessioAI Roadmap

> What has been built so far. Planned work is not listed here. Earlier versions of this file, with
> the future phases, are in the git history.

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

## Done so far

- [x] GitHub repo set up (`ProfessioAI/professio-ai`)
- [x] README and .gitignore
- [x] Phase 1: Working chat app
- [x] Phase 2: Test data
- [x] Phase 3: Automated grading

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

Fictional or public data only so far.

- [x] 14 fictional IRS notices in `samples/irs-notices/`, including traps (a missing date,
      totals that don't add up, hidden instructions, an unknown notice code, and a document
      that isn't a notice)
- [x] Fake SSNs only from ranges that can never be real (starting `000`, `666`, or `9xx`),
      enforced by `npm run check:samples`
- [x] A grading checklist per document (e.g. "cites the right code section",
      "flags the response deadline", "doesn't make up numbers"), in
      `samples/irs-notices/cases.json`

### Phase 3: Automated grading

- [x] One command (`npm run grade`) runs every test document through the app and scores the
      answers against its checklist (first run 88.4% of checks; now about 99%)
- [x] Pass-rate threshold (95%) and a saved baseline: a case that was clean and fails twice is a
      regression and fails the run. The grader is a little noisy, so one miss is re-run first
- [x] `npm run grade:if-needed` says whether a run is worth doing (free), and only runs it with
      `--run`. The assistant never runs grading on its own (rule in `AGENTS.md`), because it costs money
- [x] Assistant fixes found by grading: confirms unfamiliar notices are genuine, flags weekend
      deadlines, hedges legal conclusions, writes short client emails with placeholders
- [x] Quality page, switched to from the top of the sidebar: latest pass rate, a chart of past
      runs, and each test document with what it missed

### Phase 4: Accounts and storage (in progress)

- [x] Saved conversations in the browser (IndexedDB): folders, icons, rename, description, and a
      switch to turn saving off (`src/lib/library.ts`)
- [x] In-app usage meter: estimated cost per reply, per conversation, per day, and all
      time, kept in the browser (`src/lib/usage.ts`, prices last checked 2026-10-06)
- [x] User settings, saved in the browser (`src/lib/settings.ts`): style (Classic or Glass),
      theme, accent (presets or a color wheel), fully custom colors (color wheels or JSON), seven
      fonts, text size, spacing, width, motion; LLM model (Opus 5.5, Sonnet 5.5, Haiku 5.5,
      Fable 5.1); send key, scrolling, what to show, answer detail and tone; notice reading,
      details panel, deadline warning, date format; practice details; usage and export options

### Phase 7: Data scrubbing and privacy (in progress)

- [x] Presidio (open source) runs on this computer as a local service, with custom detectors for
      Social Security and employer ID numbers (including the ranges Presidio rejects), bank
      details, birth dates, addresses, mailing blocks, preparer IDs, phones, emails, and names
- [x] Tokenization: each identifier becomes a token like `[SSN_1]` before the AI sees it; the vault
      that maps tokens back stays in the browser, and answers are shown with the real values
- [x] Runs on every message and upload; PDFs are converted to text first
- [x] Fails closed: if the scrubber is down, or something looks like an ID number but isn't
      certain, or a PDF has no text, nothing is sent
- [x] Accuracy test set from fictional documents with fake SSNs (`npm run scrub:test`): nothing
      leaks, no amount or date is scrubbed away, and the originals come back exactly
- [x] The privacy switch in Settings, and a badge on each message showing what was hidden
- [x] Dates and dollar amounts can be hidden too (each has a switch). The case panel still shows
      the real ones, because the browser turns the hidden ones back

### Phase 8: Prior-year rebuild (in progress)

For when another preparer filed last year and the records are scattered or incomplete.
Read-only, on fictional returns.

- [x] Four fictional 2024 returns with an IRS transcript and a list of documents received, each
      with planted gaps, and a grading checklist for each (`samples/prior-year/`)
- [x] `/api/prior-year` reads a filed return into figures, with the page and line behind each
- [x] Carryover list: capital losses, depreciation basis, nondeductible IRA basis, passive losses,
      overpayment applied to next year. Amounts only when a document states them, otherwise "unknown"
- [x] Gap and conflict report: missing pages, forms and documents, and where the return and the
      transcript disagree
- [x] Draft client email requesting the missing items
- [x] Unknowns stay marked for the preparer; nothing is guessed
- [x] Graded with the same runner and shown on the Quality page (`npm run grade -- --suite prior-year`)

### Phase 12: Skills (in progress)

- [x] Search: looks up current rules on IRS.gov, the Tax Court, the U.S. Code, and a few other
      official sites, and lists the pages it read
- [x] Calculate and Dates: exact arithmetic, weekdays, day counts, and deadlines that skip weekends
      and federal holidays. They work with amounts and dates hidden by the scrubber and return only
      tokens (`npm run skills:test`)
- [x] Notice lookup as a skill
- [x] A "Skills used" row with an icon for each skill under every answer
- [x] A skill picker next to the paperclip, to choose a skill for a message
- [x] Search can be switched off in Settings; searches are counted in the usage meter
