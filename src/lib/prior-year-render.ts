import {
  FIGURE_FIELDS,
  FIGURE_LINES,
  type PriorYearReport,
} from "./prior-year-types";

const money = (n: number | null, token: string | null = null) =>
  n === null
    ? (token ?? "unknown")
    : n < 0
      ? `($${Math.abs(n).toLocaleString("en-US")})`
      : `$${n.toLocaleString("en-US")}`;

const where = (page: number | null, line: string | null) =>
  page === null && !line
    ? ""
    : ` (page ${page ?? "?"}${line ? `, ${line}` : ""})`;

/** The report as readable Markdown, for people and for the grader. */
export function reportToMarkdown(r: PriorYearReport): string {
  const out: string[] = [];
  out.push(
    `# Prior-year review${r.taxYear ? `, tax year ${r.taxYear}` : ""}`,
    "",
    `Filing status: ${r.filingStatus ?? "unknown"}. Preparer: ${r.preparer ?? "not shown"}.`,
    "",
    "## Figures from the return",
  );
  for (const f of FIGURE_FIELDS) {
    const fig = r.figures[f];
    out.push(
      `- ${FIGURE_LINES[f]}: ${money(fig.value, fig.token)}${where(fig.page, fig.line)}`,
    );
  }
  out.push("", "## Carries into the next year");
  if (r.carryovers.length === 0) out.push("- None found.");
  for (const c of r.carryovers) {
    out.push(
      `- ${c.description}: ${c.status === "found" ? money(c.amount, c.amountToken) : "unknown"}${where(c.page, c.line)}${c.document ? ` in ${c.document}` : ""}. ${c.note}`.trim(),
    );
  }
  out.push("", "## Missing items");
  if (r.missingItems.length === 0) out.push("- None.");
  for (const m of r.missingItems)
    out.push(`- ${m.item} (${m.kind}): ${m.reason}`);
  out.push("", "## Conflicts with the transcript or other papers");
  if (r.conflicts.length === 0) out.push("- None found.");
  for (const c of r.conflicts)
    out.push(
      `- ${c.description} Return: ${money(c.returnValue, c.returnToken)}. ${c.otherSource}: ${money(c.otherValue, c.otherToken)}.`,
    );
  out.push("", "## To confirm");
  if (r.confirm.length === 0) out.push("- Nothing.");
  for (const q of r.confirm) out.push(`- ${q}`);
  if (r.clientEmail.trim())
    out.push("", "## Draft request to the client", "", r.clientEmail.trim());
  return out.join("\n");
}
