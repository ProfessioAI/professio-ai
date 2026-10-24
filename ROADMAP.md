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
- [x] Phase 1: Working chat app (built; first live run with an API key still to do)

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
- [ ] First live run with an API key

**First focus:** IRS notices (e.g. CP2000 letters, audit letters). Common for firms
of every size, clearly structured, and easy to create fictional versions of.

### Phase 2: Test data
Use **only fictional or public data** until Phase 5 is complete.
- [ ] 10–20 test documents
  - Fictional documents generated with an AI model (fake names, entities, numbers)
  - Public sources: U.S. Tax Court opinions, SEC EDGAR filings,
    IRS VITA training workbooks (Pub 4491 and related), IRS e-file test scenarios
- [ ] Fake SSNs only from ranges that can never be real (starting `000`, `666`, or `9xx`)
- [ ] A grading checklist per document (e.g. "cites the right code section",
      "flags the response deadline", "doesn't make up numbers")

### Phase 3: Automated grading
- [ ] One command runs every test document through the app and scores the answers
      against its checklist
- [ ] Run it after every prompt or code change to catch regressions

### Phase 4: Accounts and storage
- [ ] Sign-in
- [ ] Saved chats and documents (Supabase)
- [ ] Per-user usage tracking (needed for seat licensing and cost control)

### Phase 5: Legal and privacy review (before any real client data)
- [ ] **IRC §7216**: rules on how tax preparers may use or share client tax
      information, including possible client consent for third-party AI services
- [ ] **FTC Safeguards Rule (GLBA)**: tax preparers must keep a written information
      security plan (see IRS Pub 4557); the app must fit into customers' plans
- [ ] Data retention: confirm current AI provider terms, consider zero data
      retention, and review our own database, logs, and file storage
- [ ] Final disclaimer wording
- [ ] Consult an attorney familiar with tax practice

### Phase 6: Pricing, billing, and pilot
- [ ] Choose a pricing model (seat-based is the current direction)
- [ ] Billing (e.g. Stripe)
- [ ] Pilot with a few friendly users, using test data only until Phase 5 is done

## Deferred for now

- **Automatic PII scrubbing** (e.g. Microsoft Presidio): only needed once real client
  files are handled, and automated scrubbers can miss things.
- **No-code tools** (Bubble, Make.com): not needed since the app is built in code.

## Open questions

- Which document types come after IRS notices?
- Which outside services should API linking connect to first?
- Seat pricing and usage limits
