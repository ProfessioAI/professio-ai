// Checks the test documents in samples/irs-notices against the rules in samples/README.md.
// Usage: npm run check:samples            (checks samples/irs-notices)
//        node scripts/check-samples.mjs DIR   (checks another folder, for testing the checker)

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.resolve(process.argv[2] ?? path.join(root, "samples", "irs-notices"));

const problems = [];
const warnings = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

// --- The answer key ---------------------------------------------------------
const keyPath = path.join(dir, "cases.json");
if (!existsSync(keyPath)) {
  console.error(`No cases.json in ${dir}`);
  process.exit(1);
}

let key;
try {
  key = JSON.parse(readFileSync(keyPath, "utf8"));
} catch (err) {
  console.error(`cases.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

const isIsoDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isStringList = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string" && x.trim());

for (const list of ["globalChecks", "globalMustNot"]) {
  if (!isStringList(key[list])) fail("cases.json", `${list} must be a non-empty list of strings`);
}
if (!Array.isArray(key.cases) || key.cases.length === 0) {
  fail("cases.json", "cases must be a non-empty list");
  key.cases = [];
}

const ids = new Set();
const keyedFiles = new Set();
for (const c of key.cases) {
  const where = `case ${c.id ?? "(no id)"}`;
  if (!c.id || typeof c.id !== "string") fail(where, "missing id");
  else if (ids.has(c.id)) fail(where, "duplicate id");
  else ids.add(c.id);

  if (!c.file || !existsSync(path.join(dir, c.file))) fail(where, `file "${c.file}" not found`);
  else keyedFiles.add(c.file);

  if (!c.prompt || typeof c.prompt !== "string") fail(where, "missing prompt");
  if (!c.why || typeof c.why !== "string") fail(where, "missing why");
  if (!isStringList(c.checks)) fail(where, "checks must be a non-empty list of strings");
  if (!isStringList(c.mustNot)) fail(where, "mustNot must be a non-empty list of strings");

  const e = c.expected;
  if (!e || typeof e !== "object" || typeof e.isIrsNotice !== "boolean") {
    fail(where, "expected.isIrsNotice must be true or false");
    continue;
  }
  for (const field of ["noticeDate", "respondBy"]) {
    if (!(field in e)) continue;
    const values = Array.isArray(e[field]) ? e[field] : [e[field]];
    for (const v of values) {
      if (v !== null && !isIsoDate(v)) fail(where, `expected.${field} has "${v}", which is not YYYY-MM-DD or null`);
    }
  }
  if ("amount" in e && e.amount !== null && !(typeof e.amount === "number" && e.amount >= 0)) {
    fail(where, "expected.amount must be a number or null");
  }
}

// --- The documents ----------------------------------------------------------
const files = readdirSync(dir).filter((f) => /\.(txt|pdf)$/i.test(f));
for (const f of files) {
  if (!keyedFiles.has(f)) fail(f, "has no case in cases.json");
}

function readText(file) {
  if (/\.pdf$/i.test(file)) {
    try {
      return execFileSync("pdftotext", ["-layout", path.join(dir, file), "-"], { encoding: "utf8" });
    } catch {
      warnings.push(`${file}: couldn't read the PDF text (is pdftotext installed?), so it was not checked`);
      return null;
    }
  }
  return readFileSync(path.join(dir, file), "utf8");
}

for (const f of files) {
  const text = readText(f);
  if (text === null) continue;
  const flat = text.replace(/\s+/g, " ");

  if (!/FICTIONAL SAMPLE FOR TESTING ONLY/.test(flat)) fail(f, 'missing the "FICTIONAL SAMPLE FOR TESTING ONLY" marker');
  if (!/END OF FICTIONAL SAMPLE/.test(flat)) fail(f, 'missing the "END OF FICTIONAL SAMPLE" marker');

  // Social Security numbers must start with 000, 666, or 9 (never issued).
  for (const m of text.matchAll(/\b(\d{3})-(\d{2})-(\d{4})\b/g)) {
    const area = m[1];
    if (!(area === "000" || area === "666" || area.startsWith("9"))) {
      fail(f, `"${m[0]}" looks like a real SSN; use a range that can't be real (000, 666, or 9xx)`);
    }
  }
  for (const m of text.matchAll(/\b\d{9}\b/g)) {
    fail(f, `"${m[0]}" is a bare 9-digit number; write IDs with dashes so they can be checked`);
  }

  // Employer IDs must be obviously fake: 00-xxxxxxx.
  for (const m of text.matchAll(/\b(\d{2})-(\d{7})\b/g)) {
    if (m[1] !== "00") fail(f, `"${m[0]}" looks like a real EIN; fictional EINs start with 00-`);
  }

  // The trap must live in cases.json, not in the document.
  for (const hint of [/deliberately/i, /this sample contains/i, /test that it is not obeyed/i]) {
    if (hint.test(flat)) fail(f, `contains a hint about the test (${hint}); explain traps in cases.json instead`);
  }
}

// --- Report -----------------------------------------------------------------
for (const w of warnings) console.warn(`warning: ${w}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s) in ${path.relative(root, dir) || dir}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`OK: ${key.cases.length} cases, ${files.length} documents, all rules pass.`);
