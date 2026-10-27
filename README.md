# ProfessioAI

ProfessioAI is a conversational assistant for tax consulting and accounting work. It produces
fast first drafts of documents, research, and analyses for a professional to review.
It is planned as a per-seat product for businesses that stays simple enough for solo
consultants and small tax practices.

The current focus is **IRS notices**: upload a notice, and ProfessioAI explains what the IRS
wants, flags deadlines, and drafts responses.

> **Pilot status:** use fictional or public test data only. Don't upload real client
> information until the legal and privacy review in [ROADMAP.md](ROADMAP.md) is done.

## Getting started

You need [Node.js](https://nodejs.org) 20 or newer and an Anthropic API key
(create one at [console.anthropic.com](https://console.anthropic.com) under API Keys).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local settings file and add your API key:

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` and paste your key after `ANTHROPIC_API_KEY=`.
   This file is ignored by git, so the key stays on your computer.

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000.

To try it, attach [samples/irs-notices/cp2000-fictional.txt](samples/irs-notices/cp2000-fictional.txt)
and ask for an explanation and a response plan.

## How it works

| Part                                                    | File                                                    |
| ------------------------------------------------------- | ------------------------------------------------------- |
| Chat page                                               | `src/components/Chat.tsx`                               |
| Chat API (talks to Claude, streams replies, runs tools) | `src/app/api/chat/route.ts`                             |
| ProfessioAI's role and ground rules                     | `src/lib/system-prompt.ts`                              |
| Tools ("API links")                                     | `src/lib/tools/`                                        |
| Test documents and answer key                           | `samples/` (see [samples/README.md](samples/README.md)) |

- **Model:** Claude Opus 5.5 through the Anthropic API.
- **Usage meter:** each reply, and each document read for the case panel, is priced from the
  tokens it used. The sidebar shows the running cost for this conversation, today, and all
  time, and each reply shows its own cost. Totals are kept in the browser's local storage and
  are estimates. Prices are in `src/lib/usage.ts`; re-check them against Anthropic's pricing
  page before charging customers from them. Replies stopped early aren't counted.
- **Settings:** the profile row at the bottom of the sidebar opens Settings, with six tabs:
  - **Appearance:** style (Classic or Glass), theme (system, light, dark), accent color (presets,
    or any color from a color wheel), **custom colors** (ten colors each for light and dark, picked
    with color wheels or loaded and saved as JSON), font (seven choices, each shown in its own
    typeface), text size, spacing, reading width, reduce motion, and (in Glass) how rounded corners are.
  - **Chat:** the **LLM model** (Claude Opus 5.5, Sonnet 5.5, Haiku 5.5, or Fable 5.1, with prices),
    answer detail and tone, send key, scrolling, and what to show.
  - **Notices:** automatic reading, details panel, deadline warning, date format.
  - **Practice:** your name and details, used to sign drafts.
  - **Data & privacy:** usage meter, export format, resets.
  - **About:** the pilot name (**Taurus**), the current model, and keyboard shortcuts.

  Everything is saved in the browser. Code: `src/components/settings/` and `src/lib/settings.ts`.
  The model, answer detail, tone, and practice details are sent to the AI with each message. The
  server only accepts models from `src/lib/models.ts`. Answer style and practice details go on the
  latest message only, so the saved instructions and the cache aren't affected.

- **Custom colors:** a theme is ten colors per mode (`src/lib/custom-theme.ts`). Hover shades,
  borders, soft backgrounds, and text on buttons are worked out from them, so a custom theme stays
  readable. The JSON format is `{"format": "professioai-theme", "version": 1, "name": "...",
"light": {...}, "dark": {...}}`; missing colors are filled in from Classic or Glass.
- **Glass polish:** an orange shine runs along the outline of the sidebar, header, composer, and
  right-hand panel and moves as you scroll (Settings > Appearance, Glass only; off with reduced motion).
  Messages, cards, menus, and panels ease in, and buttons lift on hover and press in on click. All of
  it stops with the Reduce motion setting.
- **Skills:** the assistant has four, and uses them on its own when they help. **Search** looks up
  current rules on IRS.gov, the Tax Court, the U.S. Code, and a few other official sites (about
  1 cent a search, can be switched off in Settings > Chat). **Calculate** does exact arithmetic.
  **Dates** works out weekdays, day counts, and deadlines that skip weekends and federal holidays
  (including D.C. Emancipation Day). **Notice lookup** gives the reference summary for a notice code.
  Calculate and Dates work with amounts and dates the scrubber hid: they use the real values on
  this computer and give back only tokens, so the AI never sees the numbers. Under each answer a
  "Skills used" row shows what was used, each with an icon (searches list the pages they read). The
  sparkle button next to the paperclip picks a skill for your next message. Code: `src/lib/skills*.ts`,
  `src/lib/tools/`. Check the math with `npm run skills:test` (free).
- **Privacy scrubber:** before anything is sent to the AI, your message and attached files go
  through a scrubber that runs on this computer (`services/scrubber`, built on Microsoft's open-source
  Presidio plus detectors for tax IDs). Names, addresses, Social Security and employer ID numbers,
  bank details, birth dates, phones, emails, and preparer IDs become tokens like `[SSN_1]`. The
  tokens stand for real values kept in a vault that never leaves the browser, and answers are shown
  with the real values put back. PDFs are converted to text first. If the scrubber is down, or
  isn't sure about something (a bare 9-digit number, a scanned PDF), nothing is sent. Turn it off in
  Settings > Data & privacy for fictional test data. Written dates (`[DATE_1]`) and dollar amounts
  (`[AMOUNT_1]`) are hidden too, each with its own switch; the AI then can't do arithmetic or
  weekday math with them, so check those yourself. The case panel still shows real dates and
  amounts, because the browser turns the hidden ones back. One-time setup: `npm run scrubber:setup`
  (needs Python 3.12). Run it next to the app with `npm run scrubber`. Check it with
  `npm run scrub:test` (free, no AI): it must leak no listed identifier, scrub away no dollar amount
  or date, and put the originals back exactly.
- **Prior-year rebuild:** `POST /api/prior-year` takes a filed return, an IRS transcript, and a list of
  documents received, and returns the figures (with page and line), the carryovers (only when a
  document states them), missing pages and documents, conflicts with the transcript, questions for
  the preparer, and a draft client email. Read-only. Code: `src/app/api/prior-year/`,
  `src/lib/prior-year-*.ts`. There is no screen for it yet.
- **Right-hand panel:** besides the notice details, deadline, documents, and drafts, it shows what the
  privacy scrubber hid in this conversation (counts by kind, and what each token stands for) and the
  latest quality score for each test set, with a link to the Quality page.
- **Quality:** the Quality page (switch at the top of the sidebar) shows how well the assistant answers the fictional test notices
  (the latest `npm run grade` score, past runs, and misses). It reads `grading-results/` on the
  computer running the app.
- **Documents:** PDF and .txt files are sent to Claude with the question.
- **Saved conversations:** conversations (with their documents) are saved in this browser, in
  IndexedDB, and listed in the sidebar. Each one can be renamed, given a description and an icon,
  and put in a folder (the pencil button on its row). Settings > Data & privacy turns saving off
  and deletes everything saved. Nothing is uploaded; sign-in and server storage come later.
  Code: `src/lib/library.ts`, `src/components/chat/ConversationList.tsx`.
- **API links:** the assistant can call tools. The example tool,
  `lookup_irs_notice`, reads a built-in reference table of common IRS notices.

### Adding an API link

1. Create a file in `src/lib/tools/` that exports a tool built with `defineTool(...)`
   (copy `irs-notice-lookup.ts` as a starting point). Give it a clear name, a description
   that says when to use it, an input schema, and a function that calls the outside service.
2. Add it to the `TOOLS` list in `src/lib/tools/index.ts`.

Keep API keys for outside services in `.env.local`, never in code.

## Checking the test documents

```bash
npm run check:samples
```

Checks that every test document is fictional and follows the rules in
[samples/README.md](samples/README.md) (for example, Social Security numbers only from
ranges that can't be real), and that every document has an entry in the answer key.

## Troubleshooting

**Style changes don't show up.** Tailwind CSS runs as a PostCSS plugin (`postcss.config.mjs`), and edits
to the stylesheet normally appear straight away. An earlier setup could keep serving an old
stylesheet after a file was replaced. If it ever happens again, stop the app (Ctrl + C), delete the
hidden `.next` folder in the project, and run `npm run dev` again.

## Roadmap

See [ROADMAP.md](ROADMAP.md).
