import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatUsd } from "@/lib/usage";
import { useSettings } from "@/components/settings/settings-store";
import {
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  DocLinesIcon,
  PenIcon,
  RegenerateIcon,
} from "./Icons";
import { skillInfo, type SkillUse } from "@/lib/skills";
import { SKILL_ICONS } from "./skill-icons";
import type { UIMessage } from "./types";

const FOLLOW_UPS = [
  "Summarize this for the client",
  "What happens if we miss the deadline?",
  "Which penalties could be reduced?",
];

// Tables get a scrolling card; blockquotes become the amber deadline note.
const markdownComponents: Components = {
  table: ({ children }) => (
    <div className="md-table">
      <table>{children}</table>
    </div>
  ),
  blockquote: ({ children }) => (
    <div role="note" className="md-note">
      <CalendarIcon size={20} className="md-note-icon" />
      <div>{children}</div>
    </div>
  ),
};

/** The skills an answer used, each with its icon, at the bottom of the answer. */
function SkillsRow({ uses }: { uses: SkillUse[] }) {
  return (
    <div
      aria-label="Skills used"
      className="flex flex-col gap-1.5 border-t border-border pt-3"
    >
      <div className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">
        Skills used
      </div>
      <ul className="flex flex-wrap gap-2">
        {uses.map((u, i) => {
          const Icon = SKILL_ICONS[u.id];
          return (
            <li
              key={`${u.id}-${i}`}
              className="ui-inset ui-pill flex max-w-full flex-col gap-1 rounded-[10px] border border-border bg-surface py-1.5 pr-3 pl-2.5 text-[0.8125rem] text-text-2"
            >
              <span className="flex items-center gap-2">
                <Icon size={15} className="shrink-0 text-accent-text" />
                <span className="font-medium">{skillInfo(u.id).name}</span>
                <span className="min-w-0 truncate text-text-3">{u.label}</span>
              </span>
              {u.sources?.length ? (
                <span className="flex flex-wrap gap-x-3 gap-y-0.5 pl-6 text-xs">
                  {u.sources.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="max-w-56 truncate text-accent-text underline underline-offset-2"
                      title={s.title}
                    >
                      {s.title || new URL(s.url).hostname}
                    </a>
                  ))}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function UserMessage({ message }: { message: UIMessage }) {
  return (
    <div className="flex flex-col items-end gap-2">
      {message.attachments?.map((a, i) => (
        <div
          key={`${a.name}-${i}`}
          className="flex items-center gap-2.5 rounded-[10px] border border-border bg-surface py-2.5 pr-3.5 pl-2.5"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-icon-bg text-text-3">
            <DocLinesIcon />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">{a.name}</span>
            <span className="text-xs text-muted">
              {a.mediaType === "application/pdf"
                ? "PDF document"
                : "Text document"}
            </span>
          </div>
        </div>
      ))}
      {message.skill ? (
        <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-text">
          {(() => {
            const Icon = SKILL_ICONS[message.skill];
            return <Icon size={13} />;
          })()}
          Skill picked: {skillInfo(message.skill).name}
        </span>
      ) : null}
      {message.sent && message.sent.replaced > 0 ? (
        <span className="text-xs text-muted">
          Privacy scrubber: {message.sent.replaced} identifier
          {message.sent.replaced === 1 ? "" : "s"} hidden from the AI
        </span>
      ) : null}
      {message.text ? (
        <div className="ui-bubble max-w-[min(560px,85%)] rounded-[14px_14px_4px_14px] bg-user-bubble px-4 py-3 whitespace-pre-wrap text-user-bubble-fg">
          {message.text}
        </div>
      ) : null}
    </div>
  );
}

type AssistantProps = {
  message: UIMessage;
  isLast: boolean;
  busy: boolean;
  status: string | null;
  /** Sends a prompt; `draftTitle` marks the reply as a draft for the case panel. */
  onPrompt: (prompt: string, draftTitle?: string) => void;
  onRegenerate: () => void;
};

export function AssistantMessage({
  message,
  isLast,
  busy,
  status,
  onPrompt,
  onRegenerate,
}: AssistantProps) {
  const { settings } = useSettings();
  const [copied, setCopied] = useState(false);
  const streaming = isLast && busy;
  // Answers saved before skills existed listed plain-text tool names.
  const uses: SkillUse[] =
    message.skills ??
    (message.tools ?? []).map((label) => ({ id: "notice" as const, label }));
  const finished = !streaming && message.text.trim().length > 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; nothing else to do.
    }
  }

  return (
    <>
      <article
        aria-label="ProfessioAI response"
        className="ui-panel ui-reply flex flex-col gap-3 sm:flex-row sm:gap-3.5"
      >
        <span className="text-[0.8125rem] font-semibold sm:hidden">
          ProfessioAI
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {message.text ? (
            <div className="markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          ) : null}

          {streaming && status ? (
            <p className="animate-pulse text-sm text-muted" aria-live="polite">
              {status}
            </p>
          ) : null}

          {settings.showToolChips && uses.length ? (
            <SkillsRow uses={uses} />
          ) : null}

          {finished ? (
            <>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {isLast ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onPrompt(
                          "Draft a response letter based on this, for my review.",
                          "Response letter",
                        )
                      }
                      className="flex h-10 items-center gap-2 ui-primary rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
                    >
                      <PenIcon size={16} />
                      Draft response letter
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onPrompt(
                          "Make a checklist of the documents the client should gather.",
                          "Client document checklist",
                        )
                      }
                      className="ui-raised ui-pill h-10 rounded-lg border border-border-strong bg-surface px-3.5 text-sm font-medium text-text-2 hover:bg-hover"
                    >
                      Client document checklist
                    </button>
                  </>
                ) : null}
                <span className="flex-1" />
                {settings.showReplyCost && message.costUsd !== undefined ? (
                  <span
                    className="text-xs text-muted tabular-nums"
                    title="Estimated cost of this reply"
                  >
                    ≈ {formatUsd(message.costUsd)}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={copy}
                  aria-label={copied ? "Copied" : "Copy response"}
                  title={copied ? "Copied" : "Copy"}
                  className="flex size-10 items-center justify-center rounded-lg text-text-3 hover:bg-hover"
                >
                  {copied ? (
                    <CheckIcon size={17} className="text-accent-text" />
                  ) : (
                    <CopyIcon size={17} />
                  )}
                </button>
                {isLast ? (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    aria-label="Regenerate response"
                    title="Regenerate"
                    className="flex size-10 items-center justify-center rounded-lg text-text-3 hover:bg-hover"
                  >
                    <RegenerateIcon size={17} />
                  </button>
                ) : null}
              </div>
              <p className="text-[0.8125rem] text-muted">
                Draft for professional review. Check every figure against the
                original notice before sending anything to the IRS or a client.
              </p>
            </>
          ) : null}
        </div>
      </article>

      {finished && isLast && settings.showFollowUps ? (
        <div className="flex flex-wrap gap-2 sm:pl-11">
          {FOLLOW_UPS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onPrompt(f)}
              className="ui-raised ui-pill min-h-9 rounded-full border border-border-strong bg-surface px-3.5 py-1.5 text-[0.8125rem] text-text-2 hover:bg-hover"
            >
              {f}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
