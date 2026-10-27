// Tests the privacy scrubber (services/scrubber) against samples/scrub/cases.json.
// Usage: npm run scrub:test        (starts the scrubber itself if it isn't already running)
// Passes only when no listed identifier leaks, no tax content is scrubbed away, and the scrubber
// flags what it can't be sure of. It never calls the AI, so it costs nothing.

import { spawn, execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.SCRUBBER_URL ?? "http://127.0.0.1:5002";
const key = JSON.parse(
  readFileSync(path.join(root, "samples/scrub/cases.json"), "utf8"),
);

async function healthy() {
  try {
    return (
      await fetch(`${url}/health`, { signal: AbortSignal.timeout(60_000) })
    ).ok;
  } catch {
    return false;
  }
}

let child = null;
if (!(await healthy())) {
  const py = path.join(root, "services/scrubber/.venv/bin/python");
  if (!existsSync(py)) {
    console.error("The scrubber isn't set up. Run: npm run scrubber:setup");
    process.exit(2);
  }
  child = spawn(
    py,
    [
      "-m",
      "uvicorn",
      "server:app",
      "--host",
      "127.0.0.1",
      "--port",
      new URL(url).port || "5002",
      "--app-dir",
      "services/scrubber",
    ],
    { cwd: root, stdio: "ignore" },
  );
  for (let i = 0; i < 60 && !(await healthy()); i++)
    await new Promise((r) => setTimeout(r, 1000));
  if (!(await healthy())) {
    console.error("The scrubber didn't start.");
    child.kill();
    process.exit(2);
  }
}

const post = async (route, body) => {
  const res = await fetch(url + route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${route} ${res.status}`);
  return res.json();
};

const problems = [];
let checked = 0;
const note = (id, msg) => problems.push(`${id}: ${msg}`);

// --- small texts -----------------------------------------------------------------------
for (const u of key.units) {
  const r = await post("/scrub", { text: u.text, ...(u.options ?? {}) });
  for (const id of u.identifiers) {
    checked++;
    if (r.text.includes(id)) note(u.id, `leaked "${id}"`);
  }
  for (const k of u.keep) {
    checked++;
    if (!r.text.includes(k)) note(u.id, `scrubbed away "${k}"`);
  }
  if (u.expectReview) {
    checked++;
    if (!r.needsReview) note(u.id, "should have been flagged for review");
  }
  for (const [type, n] of Object.entries(u.expectTokenCounts ?? {})) {
    checked++;
    const got = new Set(
      r.vault.filter((v) => v.type === type).map((v) => v.token),
    ).size;
    if (got !== n) note(u.id, `expected ${n} ${type} token(s), got ${got}`);
  }
  // Putting the tokens back must give the original text exactly.
  checked++;
  const back = r.text.replace(
    /\[[A-Z]+_\d+(?:_[A-Z]+)?\]/g,
    (t) => r.vault.find((v) => v.token === t)?.original ?? t,
  );
  if (back !== u.text)
    note(u.id, "putting the originals back didn't give the original text");
}

// --- the sample documents --------------------------------------------------------------
const money = /\$[\d,]+(?:\.\d{2})?/g;
const longDate =
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}\b/g;
const isoDate = /\b\d{4}-\d{2}-\d{2}\b/g;
const commaNumber = /(?<![\d,.])\d{1,3}(?:,\d{3})+(?:\.\d{2})?(?!\d|,\d)/g;
const flat = (s) => s.replace(/\s+/g, " ");
let docs = 0;
let tokens = 0;
// Two modes: the default (dates and amounts must survive) and strict (they must be gone).
for (const strict of [false, true]) {
  const mode = strict ? "strict" : "default";
  for (const c of key.corpus) {
    const file = path.join(root, c.dir ?? "samples/irs-notices", c.file);
    const isPdf = c.file.endsWith(".pdf");
    const options = strict ? { dates: true, amounts: true } : {};
    let original;
    let r;
    if (isPdf) {
      r = await post("/scrub-pdf", {
        data: readFileSync(file).toString("base64"),
        ...options,
      });
      original = execFileSync("pdftotext", ["-layout", file, "-"], {
        encoding: "utf8",
      });
    } else {
      original = readFileSync(file, "utf8");
      r = await post("/scrub", { text: original, ...options });
    }
    docs++;
    tokens += r.entities.length;
    const where = `${c.file} (${mode})`;
    for (const id of c.identifiers) {
      checked++;
      if (flat(r.text).includes(flat(id))) note(where, `leaked "${id}"`);
    }
    checked++;
    const shaped = r.text
      .replace(/\[[A-Z]+_\d+(?:_[A-Z]+)?\]/g, " ")
      .match(/\b\d{3}-\d{2}-\d{4}\b|\b\d{2}-\d{7}\b|\b\d{9}\b/g);
    if (shaped)
      note(where, `an ID-shaped number is still there: ${shaped.join(", ")}`);
    if (r.needsReview)
      note(
        where,
        `held for review: ${r.review.map((x) => `${x.type} "${x.text}"`).join("; ")}`,
      );
    // Round trip: putting the originals back must give the original text.
    checked++;
    const back = r.text.replace(
      /\[[A-Z]+_\d+(?:_[A-Z]+)?\]/g,
      (t) => r.vault.find((v) => v.token === t)?.original ?? t,
    );
    // (A PDF's text can't be compared with another extraction of it, so only text files are.)
    if (!isPdf && !r.needsReview && flat(back) !== flat(original))
      note(where, "putting the originals back didn't give the original text");
    for (const pattern of [money, longDate, isoDate, commaNumber]) {
      for (const m of new Set(flat(original).match(pattern) ?? [])) {
        checked++;
        const present = flat(r.text).includes(m);
        if (!strict && !present) note(where, `scrubbed away "${m}"`);
        if (strict && present) note(where, `leaked "${m}"`);
      }
    }
  }
}

child?.kill();
console.log(
  `${key.units.length} small texts and ${docs} document runs (default and strict), ${checked} checks, ${tokens} replaced items found in the documents`,
);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log(
  "OK: nothing leaked, nothing over-scrubbed, round trips are exact.",
);
