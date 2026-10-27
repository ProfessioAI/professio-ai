import { useEffect, useRef, useState } from "react";
import type { Attachment } from "@/lib/chat-types";
import { useSettings } from "@/components/settings/settings-store";
import { MAX_FILES_PER_MESSAGE } from "@/lib/chat-types";
import { SKILLS, type SkillId } from "@/lib/skills";
import {
  CloseIcon,
  DocIcon,
  PaperclipIcon,
  SendIcon,
  SparkIcon,
  StopIcon,
} from "./Icons";
import { SKILL_ICONS } from "./skill-icons";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  files: Attachment[];
  onRemoveFile: (index: number) => void;
  onAttach: () => void;
  busy: boolean;
  onStop: () => void;
  notice: string | null;
  placeholder: string;
  autoFocusKey?: number;
  /** The skill picked for the next message, if any. */
  skill: SkillId | null;
  onPickSkill: (skill: SkillId | null) => void;
  /** Whether the Search skill is switched on in Settings. */
  searchOn: boolean;
};

export default function Composer({
  value,
  onChange,
  onSubmit,
  files,
  onRemoveFile,
  onAttach,
  busy,
  onStop,
  notice,
  placeholder,
  autoFocusKey,
  skill,
  onPickSkill,
  searchOn,
}: Props) {
  const { settings } = useSettings();
  const modEnter = settings.sendKey === "modEnter";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = !busy && (value.trim().length > 0 || files.length > 0);

  // Grow the box with its text, up to a limit.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocusKey) textareaRef.current?.focus();
  }, [autoFocusKey]);

  // The skill picker: a small menu above its button. Escape or a click elsewhere closes it.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);
  const PickedIcon = skill ? SKILL_ICONS[skill] : null;

  return (
    <form
      className="flex w-full flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit();
      }}
    >
      {notice ? (
        <p
          role="alert"
          className="anim-rise rounded-lg bg-error-bg px-3 py-2 text-sm text-error-fg"
        >
          {notice}
        </p>
      ) : null}
      <div className="ui-panel ui-shine flex flex-col gap-2 rounded-[14px] border border-border-strong bg-surface py-2.5 pr-3 pl-4 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_4px_12px_rgba(16,24,40,0.04)] focus-within:border-accent-text">
        {files.length ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 py-1 pr-1 pl-2 text-[0.8125rem]"
              >
                <DocIcon size={14} className="text-text-3" />
                <span className="max-w-48 truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveFile(i)}
                  aria-label={`Remove ${f.name}`}
                  className="flex size-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-foreground"
                >
                  <CloseIcon size={14} />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <label htmlFor="message" className="sr-only">
          Message ProfessioAI
        </label>
        <textarea
          id="message"
          ref={textareaRef}
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            // Enter sends (Shift+Enter adds a line), or with the other setting Cmd/Ctrl+Enter sends.
            const sends = modEnter ? e.metaKey || e.ctrlKey : !e.shiftKey;
            if (sends) {
              e.preventDefault();
              if (canSend) onSubmit();
            }
          }}
          placeholder={placeholder}
          className="resize-none bg-transparent py-1 text-[0.9375rem] outline-none placeholder:text-muted"
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAttach}
            disabled={busy || files.length >= MAX_FILES_PER_MESSAGE}
            aria-label="Attach a PDF or text file"
            className="ui-raised ui-pill flex size-10 items-center justify-center rounded-lg text-text-3 hover:bg-hover disabled:opacity-40"
          >
            <PaperclipIcon />
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              disabled={busy}
              aria-label="Pick a skill for this message"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Skills"
              className="ui-raised ui-pill flex size-10 items-center justify-center rounded-lg text-accent-text hover:bg-hover disabled:opacity-40"
            >
              <SparkIcon size={21} />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                aria-label="Skills"
                className="anim-pop absolute bottom-12 left-0 z-20 flex w-72 flex-col gap-0.5 rounded-xl border border-border-strong bg-background p-1.5 shadow-xl"
              >
                <div className="px-2.5 pt-1.5 pb-1 text-xs text-muted">
                  The assistant picks skills on its own. Choose one to make sure
                  it&apos;s used for your next message.
                </div>
                {SKILLS.map((s) => {
                  const Icon = SKILL_ICONS[s.id];
                  const off = s.id === "search" && !searchOn;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={skill === s.id}
                      disabled={off}
                      onClick={() => {
                        onPickSkill(skill === s.id ? null : s.id);
                        setMenuOpen(false);
                        textareaRef.current?.focus();
                      }}
                      className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-hover disabled:opacity-50 ${
                        skill === s.id ? "bg-accent-soft" : ""
                      }`}
                    >
                      <Icon
                        size={18}
                        className="mt-0.5 shrink-0 text-accent-text"
                      />
                      <span className="flex flex-col leading-snug">
                        <span className="text-sm font-medium">{s.name}</span>
                        <span className="text-xs text-muted">
                          {off
                            ? "Switched off in Settings > Chat"
                            : s.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          {skill && PickedIcon ? (
            <span className="anim-pop flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-1 pl-2.5 text-[0.8125rem] font-medium text-accent-text">
              <PickedIcon size={14} />
              {SKILLS.find((s) => s.id === skill)?.name}
              <button
                type="button"
                onClick={() => onPickSkill(null)}
                aria-label="Remove the picked skill"
                className="flex size-6 items-center justify-center rounded-full hover:bg-hover"
              >
                <CloseIcon size={13} />
              </button>
            </span>
          ) : (
            <span className="text-xs text-muted">
              {modEnter ? "PDF or .txt · ⌘/Ctrl+Enter to send" : "PDF or .txt"}
            </span>
          )}
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              className="ui-raised ui-pill ml-auto flex size-10 items-center justify-center rounded-[10px] border border-border-strong text-text-2 hover:bg-hover"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              className="ui-pill ml-auto flex size-10 items-center justify-center rounded-[10px] bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40"
            >
              <SendIcon />
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-muted">
        ProfessioAI drafts; a professional reviews. Answers can be wrong.
      </p>
    </form>
  );
}
