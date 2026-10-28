# Changelog

Release name: **Taurus** (the pilot). The version number goes up with every major change:
a new feature or a visible redesign bumps the middle number (0.7.0), a notable fix bumps
the last (0.6.1), and 1.0.0 is the first release for real customers.
Run `npm run release -- minor "What changed"` to bump it and add an entry here.

## [0.11.0] - 2026-10-28

- Prior year page: upload a filed return, the IRS transcript, and the documents received, and see the figures, carryovers, missing items, conflicts, and a draft client email. Runs through the privacy scrubber, including hidden amounts and dates.

## [0.10.1] - 2026-10-27

- The UI halo (an orange glint on panel outlines) moves as you scroll, and the app has smoother animations (all off with reduced motion). Right-panel sections are titled Scrubber and Quality.

## [0.10.0] - 2026-10-27

- Skills: Search (official tax sites), Calculate, Dates, and Notice lookup. A Skills used row with icons under each answer, and a picker next to the paperclip. Calculate and Dates work with hidden amounts and dates without the AI seeing them.
- Searches are included in the usage meter.

## [0.9.1] - 2026-10-27

- The privacy scrubber now also hides dates and dollar amounts (each has a Settings switch). The case panel still shows the real values.

## [0.9.0] - 2026-10-27

- Privacy scrubber: client identifiers are replaced with tokens before anything reaches the AI, and put back when you read the answer. Runs on your computer (Presidio), fails closed, and has its own accuracy test (npm run scrub:test).
- Settings > Data & privacy: switch for the scrubber.

## [0.8.0] - 2026-10-27

- Prior-year rebuild: reads a filed return into figures with page and line, carryovers, missing items, and conflicts with the IRS transcript (API only).
- Four fictional 2024 returns with answer keys, graded by the same runner. The Quality page shows both test sets.
- Roadmap trimmed to finished work.

## [0.7.0] - 2026-10-27

- Phase 3 done: grading has a 95% pass threshold, a saved baseline with regression checks, and a grade-if-needed command.
- Quality page (the Chat / Quality switch at the top of the sidebar) shows the grading score, a chart over time, and what each test notice missed.
- Client emails are now short and use [Client name] and [Your name] placeholders.

## [0.6.0] - 2026-10-26

- Saved conversations: kept in the browser, with folders, icons, renamable titles, and descriptions.
- Automated grading (`npm run grade`): runs every test notice and scores the answers.
- Assistant now confirms unfamiliar notices are genuine, flags weekend deadlines, and hedges legal conclusions.
- Softer Glass shadows, a fade at the edges of scrolling areas, and the color wheel closes on scroll.

## [0.5.0] - 2026-10-26

- Glass style with a Roundness option, custom colors by color wheel or JSON, and seven fonts.
- Choice of LLM model (Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable 5.1). The pilot is named Taurus.

## [0.4.0] - 2026-10-26

- Usage meter with estimated cost per reply, conversation, day, and all time.
- Settings, with themes, accents, text size, spacing, and answer style options.
- 14 fictional IRS test notices with a grading checklist for each.

## [0.3.0] - 2026-10-24

- Case panel: notice details read from the document, with a deadline countdown.

## [0.2.0] - 2026-10-24

- Classic chat design.

## [0.1.0] - 2026-10-24

- First chat app: streaming answers, PDF and text upload, an IRS notice lookup tool, and a draft-for-review disclaimer.
