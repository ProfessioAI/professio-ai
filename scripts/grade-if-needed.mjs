// Runs `npm run grade` only when something that changes the AI's answers has changed since the
// saved baseline: the system prompt, tools, API routes, models, how documents are read, or the
// test notices themselves. Anything else (styling, settings screens) can't change a grade.
// Usage: npm run grade:if-needed [-- any options for npm run grade]

import { spawnSync, execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const watched = [
  "src/lib/system-prompt.ts",
  "src/lib/tools",
  "src/lib/models.ts",
  "src/lib/documents.ts",
  "src/app/api",
  "src/lib/prior-year-prompt.ts",
  "src/lib/prior-year-types.ts",
  "src/lib/prior-year-render.ts",
  "samples/irs-notices",
  "samples/prior-year",
];
// The baseline file and results are outputs of grading, not inputs to it.
const ignored = [
  "samples/irs-notices/grading-baseline.json",
  "samples/prior-year/grading-baseline-prior-year.json",
];

const baselinePath = path.join(
  root,
  "samples/irs-notices/grading-baseline.json",
);
const git = (...a) =>
  execFileSync("git", a, {
    cwd: root,
    stdio: ["ignore", "pipe", "ignore"],
  }).toString();

let changed = [];
let reason = "";
if (!existsSync(baselinePath)) {
  reason = "no baseline saved yet";
  changed = ["(no baseline)"];
} else {
  const { commit } = JSON.parse(readFileSync(baselinePath, "utf8"));
  try {
    const files = new Set([
      ...git("diff", "--name-only", commit, "--", ...watched).split("\n"),
      ...git(
        "ls-files",
        "--others",
        "--exclude-standard",
        "--",
        ...watched,
      ).split("\n"),
    ]);
    changed = [...files].filter((f) => f && !ignored.includes(f));
    reason = `since baseline ${commit}`;
  } catch {
    reason = "couldn't compare with the baseline commit";
    changed = ["(unknown)"];
  }
}

if (changed.length === 0) {
  console.log(
    "Nothing that affects the AI's answers has changed since the baseline. Skipping.",
  );
  process.exit(0);
}
console.log(`Changed ${reason}:\n${changed.map((f) => `  ${f}`).join("\n")}\n`);
const run = spawnSync(
  process.execPath,
  [path.join(root, "scripts/grade.mjs"), ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(run.status ?? 1);
