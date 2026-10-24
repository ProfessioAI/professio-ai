import { useEffect, useRef } from "react";
import type { Attachment } from "@/lib/chat-types";
import { MAX_FILES_PER_MESSAGE } from "@/lib/chat-types";
import { CloseIcon, DocIcon, PaperclipIcon, SendIcon, StopIcon } from "./Icons";

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
}: Props) {
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

  return (
    <form
      className="flex w-full flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit();
      }}
    >
      {notice ? (
        <p role="alert" className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error-fg">
          {notice}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 rounded-[14px] border border-border-strong bg-surface py-2.5 pr-3 pl-4 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_4px_12px_rgba(16,24,40,0.04)] focus-within:border-accent-text">
        {files.length ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 py-1 pr-1 pl-2 text-[13px]"
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
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (canSend) onSubmit();
            }
          }}
          placeholder={placeholder}
          className="resize-none bg-transparent py-1 text-[15px] outline-none placeholder:text-muted"
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAttach}
            disabled={busy || files.length >= MAX_FILES_PER_MESSAGE}
            aria-label="Attach a PDF or text file"
            className="flex size-10 items-center justify-center rounded-lg text-text-3 hover:bg-hover disabled:opacity-40"
          >
            <PaperclipIcon />
          </button>
          <span className="text-xs text-muted">PDF or .txt</span>
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              className="ml-auto flex size-10 items-center justify-center rounded-[10px] border border-border-strong text-text-2 hover:bg-hover"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              className="ml-auto flex size-10 items-center justify-center rounded-[10px] bg-accent text-white hover:bg-accent-hover disabled:opacity-40"
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
