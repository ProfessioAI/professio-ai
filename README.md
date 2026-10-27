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
