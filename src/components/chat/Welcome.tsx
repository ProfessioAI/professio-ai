import { useState } from "react";
import { CalendarIcon, InfoIcon, Logo, PenIcon, UploadIcon } from "./Icons";

export const QUICK_ACTIONS = [
  {
    title: "Explain a notice",
    detail: "What the IRS wants and why",
    prompt:
      "Explain what this notice is asking for and give me a response plan.",
    Icon: InfoIcon,
  },
  {
    title: "Find the deadlines",
    detail: "Response dates and what happens if missed",
    prompt:
      "What are the deadlines in this notice, and what happens if each one is missed?",
    Icon: CalendarIcon,
  },
  {
    title: "Draft a response",
    detail: "A letter ready for your review",
    prompt: "Draft a response letter to this notice for my review.",
    draftTitle: "Response letter",
    Icon: PenIcon,
  },
] as {
  title: string;
  detail: string;
  prompt: string;
  draftTitle?: string;
  Icon: typeof InfoIcon;
}[];

type Props = {
  onFiles: (files: FileList) => void;
  onChooseFile: () => void;
  onQuickAction: (prompt: string, draftTitle?: string) => void;
  composer: React.ReactNode;
};

export default function Welcome({
  onFiles,
  onChooseFile,
  onQuickAction,
  composer,
}: Props) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="scroll-fade flex flex-1 items-start justify-center overflow-y-auto px-4 py-10 sm:items-center sm:px-8 sm:py-16">
      <div className="flex w-full max-w-[720px] flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size={44} />
          <h1 className="mt-3 text-[1.625rem] font-semibold tracking-tight sm:text-[1.875rem]">
            What are we working on?
          </h1>
          <p className="max-w-[520px] text-text-3">
            Upload an IRS notice and get a plain-language explanation, the
            deadlines that matter, and a draft response to review.
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
          }}
          className={`ui-panel ui-big flex flex-col items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed bg-surface p-7 text-center transition-colors ${
            dragging
              ? "border-accent-text bg-accent-soft"
              : "border-dashed-border"
          }`}
        >
          <span className="flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
            <UploadIcon size={22} />
          </span>
          <div className="font-semibold">Drop an IRS notice here</div>
          <div className="text-[0.8125rem] text-muted">
            PDF or .txt · fictional or public test data during the pilot
          </div>
          <button
            type="button"
            onClick={onChooseFile}
            className="ui-raised ui-pill mt-1.5 h-10 rounded-lg border border-border-strong bg-surface px-4 text-sm font-medium text-text-2 hover:bg-hover"
          >
            Choose file
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map(({ title, detail, prompt, draftTitle, Icon }) => (
            <button
              key={title}
              type="button"
              onClick={() => onQuickAction(prompt, draftTitle)}
              className="ui-raised ui-card flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 text-left hover:border-border-strong hover:bg-hover"
            >
              <Icon className="text-accent-text" />
              <span className="text-sm font-semibold">{title}</span>
              <span className="text-[0.8125rem] leading-snug text-muted">
                {detail}
              </span>
            </button>
          ))}
        </div>

        {composer}
      </div>
    </div>
  );
}
