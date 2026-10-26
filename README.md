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

| Part | File |
|---|---|
| Chat page | `src/components/Chat.tsx` |
| Chat API (talks to Claude, streams replies, runs tools) | `src/app/api/chat/route.ts` |
| ProfessioAI's role and ground rules | `src/lib/system-prompt.ts` |
| Tools ("API links") | `src/lib/tools/` |
| Test documents and answer key | `samples/` (see [samples/README.md](samples/README.md)) |

- **Model:** Claude Opus 5.5 through the Anthropic API.
- **Usage meter:** each reply, and each document read for the case panel, is priced from the
  tokens it used. The sidebar shows the running cost for this conversation, today, and all
  time, and each reply shows its own cost. Totals are kept in the browser's local storage and
  are estimates. Prices are in `src/lib/usage.ts`; re-check them against Anthropic's pricing
  page before charging customers from them. Replies stopped early aren't counted.
- **Settings:** the profile row at the bottom of the sidebar opens Settings, with six tabs:
  Appearance (theme, accent color, text size, spacing, reading width, font, reduce motion),
  Chat (send key, scrolling, what to show, answer detail and tone), Notices (automatic
  reading, details panel, deadline warning, date format), Practice (your name and details,
  used to sign drafts), Data & privacy (usage meter, export format, resets), and About.
  Everything is saved in the browser. Code: `src/components/settings/` and `src/lib/settings.ts`.
  Answer detail, tone, and practice details are sent to the AI with each message, on the latest
  message only, so the saved instructions and the cache aren't affected.
- **Documents:** PDF and .txt files are sent to Claude with the question. Nothing is stored;
  the conversation lives in the browser tab and is gone when you refresh.
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

**Style changes don't show up.** The development server can hold on to an old stylesheet. Stop
it (Ctrl + C), delete the hidden `.next` folder in the project, and run `npm run dev` again.

## Roadmap

See [ROADMAP.md](ROADMAP.md).
