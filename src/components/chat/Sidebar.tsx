import { PILOT_NAME } from "@/lib/config";
import { initials } from "@/lib/settings";
import { useSettings } from "@/components/settings/settings-store";
import { CloseIcon, DocIcon, GearIcon, Logo, PlusIcon } from "./Icons";

type Props = {
  title: string | null;
  onNewChat: () => void;
  onClose?: () => void;
  /** The usage meter, shown above the pilot note. */
  meter?: React.ReactNode;
  onOpenSettings: () => void;
  settingsOpen: boolean;
  className?: string;
};

export default function Sidebar({
  title,
  onNewChat,
  onClose,
  meter,
  onOpenSettings,
  settingsOpen,
  className = "",
}: Props) {
  const { settings } = useSettings();
  const name = settings.displayName || "Your name";
  const practice = settings.practiceName || "Set up your practice";
  return (
    <nav
      aria-label="Conversations"
      className={`ui-panel w-[264px] shrink-0 flex-col gap-5 border-r border-border bg-surface px-4 py-5 ${className}`}
    >
      <div className="flex items-center gap-2.5 px-1">
        <Logo />
        <span className="text-[1.0625rem] font-bold tracking-tight">
          ProfessioAI
        </span>
        <span
          title={`Pilot: ${PILOT_NAME}`}
          className="ml-auto rounded-full bg-pill-bg px-2 py-0.5 text-[0.6875rem] font-semibold text-pill-fg"
        >
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
        className="flex h-11 items-center justify-center gap-2 ui-primary rounded-[10px] bg-primary text-sm font-semibold text-primary-fg hover:bg-primary-hover"
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
            className="ui-pill flex items-center gap-2.5 rounded-lg bg-accent-soft p-2.5 text-sm font-semibold"
          >
            <DocIcon size={16} className="shrink-0 text-accent-text" />
            <span className="truncate">{title}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-3 overflow-y-auto">
        {settings.showUsageMeter ? meter : null}
        <div className="ui-soft rounded-[10px] border border-warn-border bg-warn-bg px-3.5 py-3 text-[0.8125rem] leading-snug text-warn-fg">
          <strong className="mb-0.5 block">Pilot mode</strong>
          Use fictional or public test data only. Conversations aren&apos;t
          saved after you close the tab; only the usage totals stay in this
          browser.
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          aria-current={settingsOpen ? "page" : undefined}
          className={`flex items-center gap-2.5 rounded-[10px] p-2 text-left hover:bg-hover ${settingsOpen ? "bg-accent-soft" : ""}`}
        >
          <span
            aria-hidden="true"
            className="flex size-[2.125rem] shrink-0 items-center justify-center rounded-full bg-icon-bg text-[0.8125rem] font-semibold text-text-2"
          >
            {initials(settings.displayName)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span
              className={`truncate text-sm font-semibold ${settings.displayName ? "" : "text-text-3"}`}
            >
              {name}
            </span>
            <span className="truncate text-xs text-muted">{practice}</span>
          </span>
          <GearIcon size={18} className="shrink-0 text-text-3" />
        </button>
      </div>
    </nav>
  );
}
