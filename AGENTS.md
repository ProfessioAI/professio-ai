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

Grading calls the AI and costs real money (about $1.50 for a full run). **Never run it on your own.**
Don't run `npm run grade` or `npm run grade:if-needed -- --run` unless the user asks for it in that
message. After changing the system prompt, tools, API routes, models, or test documents, say that a
grading run is worth doing and what it would cost, and let the user decide. `npm run grade:if-needed`
without `--run` is free: it only lists what changed since the baseline. Save a new baseline with
`npm run grade -- --save-baseline` only after a good run the user asked for.
