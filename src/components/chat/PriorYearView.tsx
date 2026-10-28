"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/settings/controls";
import { useSettings } from "@/components/settings/settings-store";
import type { Attachment } from "@/lib/chat-types";
import { reportToMarkdown } from "@/lib/prior-year-render";
import { resolveReport } from "@/lib/prior-year-resolve";
import {
  FIGURE_FIELDS,
  FIGURE_LINES,
  type PriorYearReport,
  type PriorYearResponse,
} from "@/lib/prior-year-types";
import { scrubMessage } from "@/lib/scrub-client";
import type { VaultEntry } from "@/lib/scrub-types";
import {
  CheckIcon,
  CopyIcon,
  DocIcon,
  DownloadIcon,
  UploadIcon,
} from "./Icons";
import { readFiles } from "./types";
import type { UsageMeter } from "./usage-store";

// Reading last year's return when someone else prepared it: upload the filed return, the IRS
// transcript, and the list of documents the client handed over, and get the figures, what carries
// into the next year, what's missing, and where the papers disagree. Everything goes through the
// privacy scrubber first, like the chat does. Nothing here is saved.

type SlotId = "return" | "transcript" | "received";
const SLOTS: { id: SlotId; title: string; hint: string; required: boolean }[] =
  [
    {
      id: "return",
      title: "Filed return",
      hint: "The copy of last year's return, PDF or .txt",
      required: true,
    },
    {
      id: "transcript",
      title: "IRS transcript",
      hint: "Wage and Income, or Return Transcript",
      required: false,
    },
    {
      id: "received",
      title: "Documents received",
      hint: "A list of what the client handed over for this year",
      required: false,
    },
  ];

const money = (n: number | null, token: string | null) =>
  n === null
    ? (token ?? "Unknown")
    : n < 0
      ? `($${Math.abs(n).toLocaleString("en-US")})`
      : `$${n.toLocaleString("en-US")}`;

const where = (page: number | null, line: string | null) =>
  page === null && !line ? "" : `Page ${page ?? "?"}${line ? `, ${line}` : ""}`;

function Slot({
  slot,
  file,
  onFile,
  busy,
}: {
  slot: (typeof SLOTS)[number];
  file: Attachment | null;
  onFile: (f: FileList | File[]) => void;
  busy: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!busy && e.dataTransfer.files.length) onFile(e.dataTransfer.files);
      }}
      className={`flex flex-col gap-2 rounded-[10px] border-[1.5px] border-dashed p-4 transition-colors ${
        over ? "border-accent-text bg-accent-soft" : "border-dashed-border"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        {slot.title}
        {slot.required ? null : (
          <span className="text-xs font-normal text-muted">optional</span>
        )}
      </div>
      <div className="text-xs text-muted">{slot.hint}</div>
      {file ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[0.8125rem]">
          <DocIcon size={15} className="shrink-0 text-accent-text" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
        </div>
      ) : null}
      <input
        ref={input}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        hidden
        onChange={(e) => {
          if (e.target.files?.length) onFile(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="ui-raised ui-pill flex h-9 items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface text-[0.8125rem] font-medium text-text-2 hover:bg-hover disabled:opacity-50"
      >
        <UploadIcon size={15} />
        {file ? "Replace" : "Choose file"}
      </button>
    </div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "info" | "warn";
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
        tone === "warn"
          ? "bg-warn-bg text-warn-fg"
          : "bg-accent-soft text-accent-text"
      }`}
    >
      {children}
    </span>
  );
}

function Results({
  report,
  costUsd,
}: {
  report: PriorYearReport;
  costUsd: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(report.clientEmail.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the text is on screen to copy by hand.
    }
  }

  function download() {
    const blob = new Blob([reportToMarkdown(report)], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prior-year-review${report.taxYear ? `-${report.taxYear}` : ""}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Card
        title={`Prior-year review${report.taxYear ? `, tax year ${report.taxYear}` : ""}`}
        description={`Filing status: ${report.filingStatus ?? "unknown"}. Preparer: ${report.preparer ?? "not shown"}.`}
      >
        <div className="flex flex-wrap items-center gap-3 py-3">
          <button
            type="button"
            onClick={download}
            className="ui-raised ui-pill flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 text-[0.8125rem] font-medium text-text-2 hover:bg-hover"
          >
            <DownloadIcon size={15} />
            Download as Markdown
          </button>
          <span className="text-xs text-muted">
            A draft for the preparer to check. Estimated cost{" "}
            {costUsd < 0.01 ? "under 1¢" : `$${costUsd.toFixed(2)}`}.
          </span>
        </div>
      </Card>

      <Card
        title="Figures from the return"
        description="Each figure, with the page and line it came from."
      >
        <ul className="flex flex-col">
          {FIGURE_FIELDS.map((f) => {
            const fig = report.figures[f];
            return (
              <li
                key={f}
                className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 text-sm last:border-b-0"
              >
                <span className="text-text-2">{FIGURE_LINES[f]}</span>
                <span className="flex shrink-0 items-baseline gap-3">
                  <span className="text-xs text-muted">
                    {where(fig.page, fig.line)}
                  </span>
                  <span className="font-medium tabular-nums">
                    {money(fig.value, fig.token)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card
        title="Carries into the next year"
        description="Amounts are listed only when a document states them. Anything else is marked unknown."
      >
        {report.carryovers.length === 0 ? (
          <p className="py-4 text-sm text-muted">None found.</p>
        ) : (
          <ul className="flex flex-col">
            {report.carryovers.map((c, i) => (
              <li
                key={i}
                className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0"
              >
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    {c.description}
                    {c.status === "unknown" ? (
                      <Pill tone="warn">Unknown</Pill>
                    ) : null}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {c.status === "found"
                      ? money(c.amount, c.amountToken)
                      : "Unknown"}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {[where(c.page, c.line), c.document]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {c.note ? (
                  <div className="text-[0.8125rem] text-text-3">{c.note}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Missing items"
        description="What's needed to finish, and why it matters."
      >
        {report.missingItems.length === 0 ? (
          <p className="py-4 text-sm text-muted">Nothing missing.</p>
        ) : (
          <ul className="flex flex-col">
            {report.missingItems.map((m, i) => (
              <li
                key={i}
                className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  {m.item}
                  <Pill tone="info">{m.kind}</Pill>
                </div>
                <div className="text-[0.8125rem] text-text-3">{m.reason}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Conflicts"
        description="Where the return and the transcript or other papers disagree."
      >
        {report.conflicts.length === 0 ? (
          <p className="py-4 text-sm text-muted">None found.</p>
        ) : (
          <ul className="flex flex-col">
            {report.conflicts.map((c, i) => (
              <li
                key={i}
                className="flex flex-col gap-1.5 border-b border-border py-3 last:border-b-0"
              >
                <div className="text-sm">{c.description}</div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-[0.8125rem]">
                  <span>
                    <span className="text-muted">Return: </span>
                    <span className="font-medium tabular-nums">
                      {money(c.returnValue, c.returnToken)}
                    </span>
                  </span>
                  <span>
                    <span className="text-muted">{c.otherSource}: </span>
                    <span className="font-medium tabular-nums">
                      {money(c.otherValue, c.otherToken)}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {report.confirm.length ? (
        <Card
          title="To confirm"
          description="Questions the preparer needs to settle."
        >
          <ul className="list-disc space-y-1.5 py-4 pl-5 text-[0.8125rem] leading-snug text-text-3">
            {report.confirm.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {report.clientEmail.trim() ? (
        <Card
          title="Draft request to the client"
          description="Use [Client name] and [Your name] placeholders; edit before sending."
        >
          <pre className="my-3 max-h-72 overflow-y-auto rounded-lg border border-border bg-background p-3 text-[0.8125rem] leading-relaxed whitespace-pre-wrap">
            {report.clientEmail.trim()}
          </pre>
          <div className="pb-3">
            <button
              type="button"
              onClick={copyEmail}
              className="ui-raised ui-pill flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 text-[0.8125rem] font-medium text-text-2 hover:bg-hover"
            >
              {copied ? (
                <CheckIcon size={15} className="text-accent-text" />
              ) : (
                <CopyIcon size={15} />
              )}
              {copied ? "Copied" : "Copy email"}
            </button>
          </div>
        </Card>
      ) : null}
    </>
  );
}

/** The Prior year page. */
export default function PriorYearView({
  onBack,
  meter,
}: {
  onBack: () => void;
  meter: UsageMeter;
}) {
  const { settings } = useSettings();
  const [files, setFiles] = useState<Record<SlotId, Attachment | null>>({
    return: null,
    transcript: null,
    received: null,
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    report: PriorYearReport;
    costUsd: number;
  } | null>(null);

  async function pick(slot: SlotId, list: FileList | File[]) {
    setError(null);
    const { attachments, errors } = await readFiles(list);
    if (errors.length) setError(errors.join(" "));
    const first = attachments[0];
    if (first) setFiles((prev) => ({ ...prev, [slot]: first }));
  }

  async function run() {
    const chosen = SLOTS.map((s) => files[s.id]).filter(
      (f): f is Attachment => f !== null,
    );
    if (!files.return || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      // Hide client identifiers first, when the scrubber is on. Nothing is sent if it can't.
      let toSend = chosen;
      let vault: VaultEntry[] = [];
      if (settings.scrubUploads) {
        setStatus("Hiding client identifiers…");
        const r = await scrubMessage("", chosen, [], {
          dates: settings.scrubDates,
          amounts: settings.scrubAmounts,
        });
        if (!r.ok) {
          const found = r.review
            .slice(0, 3)
            .map((x) => `${x.type}: ${x.text || x.reason}`)
            .join("; ");
          setError(found ? `${r.error} (${found})` : r.error);
          return;
        }
        toSend = r.message.attachments;
        vault = r.vault;
      }
      setStatus("Reading the return…");
      const res = await fetch("/api/prior-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachments: toSend, model: settings.model }),
      });
      const body = (await res.json().catch(() => null)) as
        (PriorYearResponse & { error?: string }) | null;
      if (body?.usage) meter.record(body.usage);
      if (!res.ok || !body?.report)
        throw new Error(body?.error ?? "Couldn't read the return.");
      setResult({
        report: resolveReport(body.report, vault),
        costUsd: body.usage?.costUsd ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <div className="anim-fade flex min-h-0 flex-1 flex-col">
      <header className="ui-panel ui-header flex items-center gap-3 border-b border-border bg-surface px-3 py-3 sm:px-8 sm:py-4">
        <button
          type="button"
          onClick={onBack}
          className="ui-raised ui-pill flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-text-2 hover:bg-hover"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to chat
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.0625rem] font-semibold tracking-tight">
            Prior-year rebuild
          </h1>
          <p className="truncate text-xs text-muted">
            For when someone else filed last year and the records are scattered
          </p>
        </div>
      </header>

      <div className="scroll-fade flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 pt-6 pb-12 sm:px-8">
          <Card
            title="Upload the papers"
            description="The assistant reads them and reports the figures, what carries into the next year, what's missing, and where they disagree. It never guesses a carryover that no document states."
          >
            <div className="grid gap-3 py-4 sm:grid-cols-3">
              {SLOTS.map((s) => (
                <Slot
                  key={s.id}
                  slot={s}
                  file={files[s.id]}
                  onFile={(list) => pick(s.id, list)}
                  busy={busy}
                />
              ))}
            </div>
            {error ? (
              <p
                role="alert"
                className="mb-3 rounded-lg bg-error-bg px-3 py-2 text-sm text-error-fg"
              >
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3 border-t border-border py-3">
              <button
                type="button"
                onClick={run}
                disabled={!files.return || busy}
                className="ui-primary h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-40"
              >
                {busy ? "Working…" : "Review the return"}
              </button>
              <span
                className={`text-xs text-muted ${busy ? "animate-pulse" : ""}`}
                aria-live="polite"
              >
                {status ??
                  (settings.scrubUploads
                    ? "Client identifiers are hidden from the AI first."
                    : "The privacy scrubber is off: files go to the AI as they are.")}
              </span>
            </div>
          </Card>

          {result ? (
            <Results report={result.report} costUsd={result.costUsd} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
