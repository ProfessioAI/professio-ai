import { APP_VERSION, PILOT_NAME } from "@/lib/config";
import { initials } from "@/lib/settings";
import { useSettings } from "@/components/settings/settings-store";
import ConversationList from "./ConversationList";
import { CloseIcon, GearIcon, Logo, PlusIcon } from "./Icons";

type Props = {
  /** The open conversation's saved id, if it has been saved. */
  currentId: string | null;
  onOpen: (id: string) => void;
  onDeleted: (id: string) => void;
  onNewChat: () => void;
  onClose?: () => void;
  /** The usage meter, shown above the pilot note. */
  meter?: React.ReactNode;
  onOpenSettings: () => void;
  settingsOpen: boolean;
  /** Which page is showing, for the Chat / Quality switch at the top. */
  page: "chat" | "quality" | "settings";
  onSelectPage: (page: "chat" | "quality") => void;
  className?: string;
};

export default function Sidebar({
  currentId,
  onOpen,
  onDeleted,
  onNewChat,
  onClose,
  meter,
  onOpenSettings,
  settingsOpen,
  page,
  onSelectPage,
  className = "",
}: Props) {
  const { settings } = useSettings();
  const name = settings.displayName || "Your name";
  const practice = settings.practiceName || "Set up your practice";
  return (
    <nav
      aria-label="Conversations"
      className={`ui-panel ui-shine w-[264px] shrink-0 flex-col gap-5 border-r border-border bg-surface px-4 py-5 ${className}`}
    >
      <div className="flex items-center gap-2.5 px-1">
        <Logo />
        <span className="text-[1.0625rem] font-bold tracking-tight">
          ProfessioAI
        </span>
        <span
          title={`Pilot: ${PILOT_NAME} · version ${APP_VERSION}`}
          className="ml-auto rounded-full bg-pill-bg px-2 py-0.5 text-[0.6875rem] font-semibold text-pill-fg"
        >
          Pilot v{APP_VERSION}
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

      <div
        role="tablist"
        aria-label="Site sections"
        className="ui-inset ui-pill flex gap-1 rounded-lg bg-background p-1"
      >
        {(
          [
            ["chat", "Chat"],
            ["quality", "Quality"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={page === id}
            onClick={() => onSelectPage(id)}
            className={`h-9 flex-1 rounded-lg text-sm font-medium ${
              page === id
                ? "ui-seg-on bg-surface text-foreground shadow-sm"
                : "text-text-3 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onNewChat}
        className="flex h-11 items-center justify-center gap-2 ui-primary rounded-[10px] bg-primary text-sm font-semibold text-primary-fg hover:bg-primary-hover"
      >
        <PlusIcon />
        New conversation
      </button>

      <ConversationList
        currentId={currentId}
        onOpen={onOpen}
        onDeleted={onDeleted}
      />

      <div className="mt-auto flex flex-col gap-3 overflow-y-auto">
        {settings.showUsageMeter ? meter : null}
        <div className="ui-soft rounded-[10px] border border-warn-border bg-warn-bg px-3.5 py-3 text-[0.8125rem] leading-snug text-warn-fg">
          <strong className="mb-0.5 block">Pilot mode</strong>
          Use fictional or public test data only.{" "}
          {settings.saveChats
            ? "Conversations are saved in this browser only."
            : "Saving is off, so conversations disappear when you close the tab."}
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
