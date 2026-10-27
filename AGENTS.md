<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Versioning

Every major change (a new feature, a visible redesign, a roadmap item finished) gets a version
bump and a CHANGELOG entry in the same commit: run `npm run release -- minor "What changed"`
(use `patch` for a notable fix; `major` is reserved for the first customer release). The number
shows in the sidebar badge and Settings > About. Small tweaks don't need a bump.

## Grading

After changing the system prompt, tools, API routes, models, or the test notices, run
`npm run grade:if-needed` (the app must be running). It runs the full grader only when one of
those changed since the saved baseline, fails under 95% or on a regression, and costs about $1.
Save a new baseline with `npm run grade -- --save-baseline` after a good run that you intend to keep.
