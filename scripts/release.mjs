// Bumps the app version and adds a CHANGELOG entry.
// Usage: npm run release -- <major|minor|patch> "What changed" ["Another change" ...]
//   minor: a major change (new feature, visible redesign)   0.6.0 -> 0.7.0
//   patch: a notable fix                                    0.6.0 -> 0.6.1
//   major: the first release for real customers             0.6.0 -> 1.0.0
// It edits package.json, package-lock.json, and CHANGELOG.md, and commits nothing.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [kind, ...notes] = process.argv.slice(2);
if (!["major", "minor", "patch"].includes(kind) || notes.length === 0) {
  console.error(
    'Usage: npm run release -- <major|minor|patch> "What changed" ["Another change" ...]',
  );
  process.exit(2);
}

const read = (f) => JSON.parse(readFileSync(path.join(root, f), "utf8"));
const write = (f, v) =>
  writeFileSync(path.join(root, f), JSON.stringify(v, null, 2) + "\n");

const pkg = read("package.json");
const [maj, min, pat] = pkg.version.split(".").map(Number);
const next =
  kind === "major"
    ? `${maj + 1}.0.0`
    : kind === "minor"
      ? `${maj}.${min + 1}.0`
      : `${maj}.${min}.${pat + 1}`;

const previous = pkg.version;
pkg.version = next;
write("package.json", pkg);
try {
  const lock = read("package-lock.json");
  lock.version = next;
  if (lock.packages?.[""]) lock.packages[""].version = next;
  write("package-lock.json", lock);
} catch {
  /* no lock file */
}

const date = new Date().toISOString().slice(0, 10);
const entry = `## [${next}] - ${date}\n${notes.map((n) => `- ${n}`).join("\n")}\n\n`;
const logPath = path.join(root, "CHANGELOG.md");
const log = readFileSync(logPath, "utf8");
const at = log.indexOf("\n## [");
writeFileSync(
  logPath,
  at < 0
    ? log + "\n" + entry
    : log.slice(0, at + 1) + entry + log.slice(at + 1),
);

console.log(`Version ${previous} -> ${next}. Added to CHANGELOG.md.`);
