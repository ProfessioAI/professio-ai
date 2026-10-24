import { CloseIcon, DocIcon, Logo, PlusIcon } from "./Icons";

type Props = {
  title: string | null;
  onNewChat: () => void;
  onClose?: () => void;
  className?: string;
};

export default function Sidebar({ title, onNewChat, onClose, className = "" }: Props) {
  return (
    <nav
      aria-label="Conversations"
      className={`w-[264px] shrink-0 flex-col gap-5 border-r border-border bg-surface px-4 py-5 ${className}`}
    >
      <div className="flex items-center gap-2.5 px-1">
        <Logo />
        <span className="text-[17px] font-bold tracking-tight">ProfessioAI</span>
        <span className="ml-auto rounded-full bg-pill-bg px-2 py-0.5 text-[11px] font-semibold text-pill-fg">
          Pilot
        </span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-10 items-center justify-center rounded-lg text-text-3 hover:bg-hover"
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onNewChat}
        className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-accent text-sm font-semibold text-white hover:bg-accent-hover"
      >
        <PlusIcon />
        New conversation
      </button>

      {title ? (
        <div className="flex flex-col gap-1">
          <div className="px-2 pb-1 text-xs font-semibold tracking-[0.06em] text-muted uppercase">
            Today
          </div>
          <div
            aria-current="page"
            className="flex items-center gap-2.5 rounded-lg bg-accent-soft p-2.5 text-sm font-semibold"
          >
            <DocIcon size={16} className="shrink-0 text-accent-text" />
            <span className="truncate">{title}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-auto rounded-[10px] border border-warn-border bg-warn-bg px-3.5 py-3 text-[13px] leading-snug text-warn-fg">
        <strong className="mb-0.5 block">Pilot mode</strong>
        Use fictional or public test data only. Nothing is stored after you close the tab.
      </div>
    </nav>
  );
}
