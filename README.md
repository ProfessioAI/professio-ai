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
| Test documents | `samples/` |

- **Model:** Claude Opus 5.5 through the Anthropic API.
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

## Roadmap

See [ROADMAP.md](ROADMAP.md).
