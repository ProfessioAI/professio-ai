"use client";

import Quality from "./Quality";

/** The Quality page: how well the assistant answers the fictional test notices. */
export default function QualityView({ onBack }: { onBack: () => void }) {
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
            Quality
          </h1>
          <p className="truncate text-xs text-muted">
            Graded on the fictional test notices
          </p>
        </div>
      </header>
      <div className="scroll-fade flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 pt-6 pb-12 sm:px-8">
          <Quality />
        </div>
      </div>
    </div>
  );
}
