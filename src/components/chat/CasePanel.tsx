import { useState } from "react";
import { CheckIcon, CloseIcon, CopyIcon, DocIcon, DownloadIcon } from "./Icons";
import { useSettings } from "@/components/settings/settings-store";
import type { DateFormat, WarnDays } from "@/lib/settings";
import {
  countdown,
  formatDate,
  formatMoney,
  type DetailsState,
} from "./notice-utils";
import type { VaultEntry } from "@/lib/scrub-types";
import { QualitySection, ScrubberSection } from "./SidePanels";
import type { Draft } from "./types";

type Props = {
  details: DetailsState;
  documents: string[];
  drafts: Draft[];
  /** What the privacy scrubber hid in this conversation. */
  vault: VaultEntry[];
  onOpenQuality: () => void;
  onRetry: () => void;
  onClose?: () => void;
  className?: string;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 text-xs font-semibold tracking-[0.06em] text-muted uppercase">
      {children}
    </div>
  );
}

const BAR_TONE = {
  ok: "bg-accent",
  warn: "bg-bar-warn",
  danger: "bg-bar-danger",
} as const;
const TEXT_TONE = {
  ok: "text-foreground",
  warn: "text-warn-strong",
  danger: "text-bar-danger",
} as const;

function NoticeSection({
  details,
  onRetry,
  autoRead,
  hasDocuments,
  dateFormat,
}: {
  details: DetailsState;
  onRetry: () => void;
  autoRead: boolean;
  hasDocuments: boolean;
  dateFormat: DateFormat;
}) {
  if (details.status === "idle") {
    // Reading is switched off in settings: let the user read this notice on demand.
    if (!autoRead && hasDocuments) {
      return (
        <div className="flex flex-col items-start gap-2 text-[0.8125rem] text-muted">
          <p>Reading notice details is switched off in Settings.</p>
          <button
            type="button"
            onClick={onRetry}
            className="h-9 rounded-lg border border-border-strong px-3 text-[0.8125rem] font-medium text-text-2 hover:bg-hover"
          >
            Read details now
          </button>
          <p className="text-xs">Costs a small amount for each document.</p>
        </div>
      );
    }
    return (
      <p className="text-[0.8125rem] text-muted">
        Attach a notice to see its key details here.
      </p>
    );
  }
  if (details.status === "loading") {
    return (
      <div className="flex flex-col gap-3" aria-live="polite">
        <span className="sr-only">Reading the notice…</span>
        <div className="h-7 w-32 animate-pulse rounded bg-hover" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded bg-hover" />
          ))}
        </div>
      </div>
    );
  }
  if (details.status === "error") {
    return (
      <div className="flex flex-col items-start gap-2 text-[0.8125rem] text-muted">
        <p>{details.message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="h-9 rounded-lg border border-border-strong px-3 text-[0.8125rem] font-medium text-text-2 hover:bg-hover"
        >
          Try again
        </button>
      </div>
    );
  }

  const d = details.data;
  if (!d.isIrsNotice) {
    return (
      <p className="text-[0.8125rem] text-muted">
        This document doesn&apos;t look like an IRS notice, so there are no
        notice details to show.
      </p>
    );
  }

  const rows: { label: string; value: string; className?: string }[] = [];
  if (d.taxYear) rows.push({ label: "Tax year", value: d.taxYear });
  if (d.noticeDate)
    rows.push({
      label: "Notice date",
      value: formatDate(d.noticeDate, true, dateFormat),
    });
  if (d.respondBy)
    rows.push({
      label: "Respond by",
      value: formatDate(d.respondBy, true, dateFormat),
      className: "font-semibold text-warn-strong",
    });
  if (d.amount !== null)
    rows.push({
      label: d.amountLabel ?? "Amount",
      value: formatMoney(d.amount),
      className: "font-mono font-semibold",
    });

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-mono text-[1.375rem] font-medium">
          {d.code ?? "IRS notice"}
        </span>
        {d.name ? (
          <span className="text-[0.8125rem] text-text-3">{d.name}</span>
        ) : null}
      </div>
      {rows.length ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3.5 text-[0.8125rem]">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="text-muted">{r.label}</dt>
              <dd className={`mt-0.5 font-medium ${r.className ?? ""}`}>
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function DeadlineSection({
  respondBy,
  noticeDate,
  warnDays,
}: {
  respondBy: string;
  noticeDate: string | null;
  warnDays: WarnDays;
}) {
  const c = countdown(respondBy, noticeDate, warnDays);
  return (
    <section className="border-t border-border pt-5">
      <SectionLabel>Deadline</SectionLabel>
      <div className="mb-2 flex justify-between text-[0.8125rem]">
        <span className={`font-semibold ${TEXT_TONE[c.tone]}`}>{c.label}</span>
        {c.totalDays !== null ? (
          <span className="text-muted">of {c.totalDays}</span>
        ) : null}
      </div>
      {c.usedFraction !== null && c.totalDays !== null ? (
        <div
          role="img"
          aria-label={`${Math.round(c.usedFraction * c.totalDays)} of ${c.totalDays} days used`}
          className="h-2 overflow-hidden rounded-full bg-border-row"
        >
          <div
            className={`h-full rounded-full ${BAR_TONE[c.tone]}`}
            style={{ width: `${Math.max(c.usedFraction * 100, 2)}%` }}
          />
        </div>
      ) : null}
      <p className="mt-3 text-xs leading-snug text-muted">
        Read from the notice by AI. Confirm the date on the original, and allow
        for mailing time.
      </p>
    </section>
  );
}

function DraftItem({ draft }: { draft: Draft }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; nothing else to do.
    }
  }

  function download() {
    const blob = new Blob([draft.text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-border p-2.5 pl-3">
      <DocIcon size={16} className="shrink-0 text-accent-text" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {draft.title}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : `Copy ${draft.title}`}
        title={copied ? "Copied" : "Copy"}
        className="flex size-8 items-center justify-center rounded-md text-text-3 hover:bg-hover"
      >
        {copied ? (
          <CheckIcon size={15} className="text-accent-text" />
        ) : (
          <CopyIcon size={15} />
        )}
      </button>
      <button
        type="button"
        onClick={download}
        aria-label={`Download ${draft.title}`}
        title="Download"
        className="flex size-8 items-center justify-center rounded-md text-text-3 hover:bg-hover"
      >
        <DownloadIcon size={15} />
      </button>
    </div>
  );
}

export default function CasePanel({
  details,
  documents,
  drafts,
  vault,
  onOpenQuality,
  onRetry,
  onClose,
  className = "",
}: Props) {
  const { settings } = useSettings();
  const respondBy =
    details.status === "ready" && details.data.isIrsNotice
      ? details.data.respondBy
      : null;
  const noticeDate =
    details.status === "ready" ? details.data.noticeDate : null;

  return (
    <aside
      aria-label="Notice details"
      className={`ui-panel ui-shine w-[300px] shrink-0 flex-col border-l border-border bg-surface ${className}`}
    >
      <div className="stagger scroll-fade flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto rounded-[inherit] px-5 pt-6 pb-10">
        <section>
          <div className="flex items-start justify-between">
            <SectionLabel>Notice</SectionLabel>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close details"
                className="-mt-2.5 -mr-2 flex size-10 items-center justify-center rounded-lg text-text-3 hover:bg-hover"
              >
                <CloseIcon />
              </button>
            ) : null}
          </div>
          <NoticeSection
            details={details}
            onRetry={onRetry}
            autoRead={settings.autoReadNotice}
            hasDocuments={documents.length > 0}
            dateFormat={settings.dateFormat}
          />
        </section>

        {respondBy ? (
          <DeadlineSection
            respondBy={respondBy}
            noticeDate={noticeDate}
            warnDays={settings.warnDays}
          />
        ) : null}

        <section className="border-t border-border pt-5">
          <SectionLabel>Documents</SectionLabel>
          {documents.length ? (
            <ul className="flex flex-col gap-2.5">
              {documents.map((name) => (
                <li key={name} className="flex items-center gap-2.5 text-sm">
                  <DocIcon size={18} className="shrink-0 text-text-3" />
                  <span className="truncate">{name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[0.8125rem] text-muted">
              No documents attached yet.
            </p>
          )}
        </section>

        <section className="border-t border-border pt-5">
          <SectionLabel>Drafts</SectionLabel>
          {drafts.length ? (
            <div className="flex flex-col gap-2">
              {drafts.map((d, i) => (
                <DraftItem key={`${d.title}-${i}`} draft={d} />
              ))}
            </div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-border-strong p-4 text-center text-[0.8125rem] text-muted">
              Letters and checklists you draft will appear here.
            </div>
          )}
        </section>

        <ScrubberSection vault={vault} />
        <QualitySection onOpen={onOpenQuality} />
      </div>
    </aside>
  );
}
