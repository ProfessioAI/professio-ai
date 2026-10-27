"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmButton } from "@/components/settings/controls";
import {
  ICON_IDS,
  LIMITS,
  createFolder,
  deleteConversation,
  deleteFolder,
  renameFolder,
  toggleFolder,
  updateItem,
  useLibrary,
  type Folder,
  type LibraryItem,
} from "@/lib/library";
import { CONVERSATION_ICONS } from "./conversation-icons";
import { ChevronIcon, FolderIcon, PenIcon, PlusIcon } from "./Icons";

const inputClass =
  "ui-inset w-full rounded-lg border border-border-strong bg-background px-3 text-sm outline-none placeholder:text-muted focus:border-accent-text";

/** Edit a conversation's title, description, icon, and folder. */
function DetailsDialog({
  item,
  folders,
  onClose,
  onDeleted,
}: {
  item: LibraryItem;
  folders: Folder[];
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [icon, setIcon] = useState(item.icon);
  const [folderId, setFolderId] = useState<string>(item.folderId ?? "");
  const [newFolder, setNewFolder] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    // A new folder name, if typed, wins over the dropdown.
    const target = newFolder.trim()
      ? createFolder(newFolder)
      : folderId || null;
    updateItem(item.id, {
      title,
      description,
      icon,
      folderId: target,
    });
    onClose();
  }

  // Rendered on the page itself: the frosted sidebar would otherwise trap a fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="anim-fade absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-h`}
        className="anim-pop ui-panel relative flex max-h-full w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl"
      >
        <h2 id={`${uid}-h`} className="text-base font-semibold">
          Conversation details
        </h2>

        <div>
          <label
            htmlFor={`${uid}-t`}
            className="mb-1 block text-sm font-medium"
          >
            Title
          </label>
          <input
            ref={titleRef}
            id={`${uid}-t`}
            value={title}
            maxLength={LIMITS.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Follows your first question if left empty"
            className={`${inputClass} h-10`}
          />
        </div>

        <div>
          <label
            htmlFor={`${uid}-d`}
            className="mb-1 block text-sm font-medium"
          >
            Description
          </label>
          <textarea
            id={`${uid}-d`}
            value={description}
            maxLength={LIMITS.description}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional. What this conversation is for."
            className={`${inputClass} py-2`}
          />
        </div>

        <div role="radiogroup" aria-label="Icon">
          <div className="mb-1 text-sm font-medium">Icon</div>
          <div className="flex flex-wrap gap-1.5">
            {ICON_IDS.map((id) => {
              const { label, Icon } = CONVERSATION_ICONS[id];
              const on = icon === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={label}
                  title={label}
                  onClick={() => setIcon(id)}
                  className={`ui-raised flex size-10 items-center justify-center rounded-lg border ${
                    on
                      ? "ui-selected border-accent-text bg-accent-soft text-accent-text ring-1 ring-accent-text"
                      : "border-border bg-surface text-text-2 hover:bg-hover"
                  }`}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor={`${uid}-f`}
            className="mb-1 block text-sm font-medium"
          >
            Folder
          </label>
          <select
            id={`${uid}-f`}
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className={`${inputClass} h-10`}
          >
            <option value="">None</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <input
            value={newFolder}
            maxLength={LIMITS.folder}
            onChange={(e) => setNewFolder(e.target.value)}
            aria-label="Or put it in a new folder"
            placeholder="Or type a new folder name"
            className={`${inputClass} mt-2 h-10`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <ConfirmButton
            label="Delete"
            confirmLabel="Press again to delete"
            danger
            onConfirm={() => {
              void deleteConversation(item.id);
              onDeleted(item.id);
              onClose();
            }}
          />
          <span className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="ui-raised ui-pill h-10 rounded-lg border border-border-strong bg-surface px-3.5 text-sm font-medium text-text-2 hover:bg-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="ui-primary h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({
  item,
  current,
  onOpen,
  onEdit,
}: {
  item: LibraryItem;
  current: boolean;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const { Icon } = CONVERSATION_ICONS[item.icon];
  return (
    <div
      className={`anim-fade group ui-pill flex items-center gap-1 rounded-lg ${
        current ? "bg-accent-soft" : "hover:bg-hover"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        aria-current={current ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-2.5 text-left"
      >
        <Icon size={16} className="shrink-0 text-accent-text" />
        <span className="flex min-w-0 flex-1 flex-col leading-snug">
          <span
            className={`truncate text-sm ${current ? "font-semibold" : "font-medium"}`}
          >
            {item.title}
          </span>
          {item.description ? (
            <span className="truncate text-xs text-muted">
              {item.description}
            </span>
          ) : null}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onEdit(item.id)}
        aria-label={`Edit details: ${item.title}`}
        title="Rename, describe, change icon or folder"
        className="mr-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-text-3 hover:bg-hover hover:text-foreground focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <PenIcon size={14} />
      </button>
    </div>
  );
}

function FolderHeader({ folder, count }: { folder: Folder; count: number }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);

  if (renaming) {
    return (
      <form
        className="flex items-center gap-1.5 px-1"
        onSubmit={(e) => {
          e.preventDefault();
          renameFolder(folder.id, name);
          setRenaming(false);
        }}
      >
        <input
          autoFocus
          value={name}
          maxLength={LIMITS.folder}
          aria-label="Folder name"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            renameFolder(folder.id, name);
            setRenaming(false);
          }}
          onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
          className={`${inputClass} h-8`}
        />
      </form>
    );
  }
  return (
    <div className="group flex items-center gap-1">
      <button
        type="button"
        onClick={() => toggleFolder(folder.id)}
        aria-expanded={folder.open}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-hover"
      >
        <ChevronIcon
          size={14}
          className={`shrink-0 text-text-3 transition-transform ${folder.open ? "rotate-90" : ""}`}
        />
        <FolderIcon size={15} className="shrink-0 text-text-3" />
        <span className="truncate text-[0.8125rem] font-semibold">
          {folder.name}
        </span>
        <span className="text-xs text-muted tabular-nums">{count}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          setName(folder.name);
          setRenaming(true);
        }}
        aria-label={`Rename folder ${folder.name}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-3 hover:bg-hover hover:text-foreground focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <PenIcon size={14} />
      </button>
      <ConfirmButton
        label="×"
        confirmLabel="Delete folder?"
        danger
        onConfirm={() => deleteFolder(folder.id)}
        ariaLabel={`Delete folder ${folder.name} (its conversations are kept)`}
        compact
      />
    </div>
  );
}

export default function ConversationList({
  currentId,
  onOpen,
  onDeleted,
}: {
  currentId: string | null;
  onOpen: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const { folders, items } = useLibrary();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const editing = items.find((i) => i.id === editingId) ?? null;
  const loose = items.filter((i) => !i.folderId);

  if (items.length === 0 && folders.length === 0 && !addingFolder) {
    return (
      <div className="flex flex-col gap-1">
        <p className="px-2 text-xs leading-snug text-muted">
          Your conversations are saved here, in this browser.
        </p>
        <button
          type="button"
          onClick={() => setAddingFolder(true)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[0.8125rem] font-medium text-text-3 hover:bg-hover hover:text-foreground"
        >
          <PlusIcon size={14} />
          New folder
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-1 overflow-y-auto">
      {folders.map((f) => {
        const inside = items.filter((i) => i.folderId === f.id);
        return (
          <div key={f.id} className="flex flex-col gap-0.5">
            <FolderHeader folder={f} count={inside.length} />
            {f.open
              ? inside.map((i) => (
                  <div key={i.id} className="pl-3">
                    <Row
                      item={i}
                      current={i.id === currentId}
                      onOpen={onOpen}
                      onEdit={setEditingId}
                    />
                  </div>
                ))
              : null}
          </div>
        );
      })}

      {loose.length ? (
        <div className="flex flex-col gap-0.5">
          {folders.length ? (
            <div className="px-2 pt-2 pb-1 text-xs font-semibold tracking-[0.06em] text-muted uppercase">
              Conversations
            </div>
          ) : null}
          {loose.map((i) => (
            <Row
              key={i.id}
              item={i}
              current={i.id === currentId}
              onOpen={onOpen}
              onEdit={setEditingId}
            />
          ))}
        </div>
      ) : null}

      {addingFolder ? (
        <form
          className="px-1 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            createFolder(folderName);
            setFolderName("");
            setAddingFolder(false);
          }}
        >
          <input
            autoFocus
            value={folderName}
            maxLength={LIMITS.folder}
            aria-label="New folder name"
            placeholder="Folder name, then Enter"
            onChange={(e) => setFolderName(e.target.value)}
            onBlur={() => {
              if (folderName.trim()) createFolder(folderName);
              setFolderName("");
              setAddingFolder(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setFolderName("");
                setAddingFolder(false);
              }
            }}
            className={`${inputClass} h-9`}
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAddingFolder(true)}
          className="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[0.8125rem] font-medium text-text-3 hover:bg-hover hover:text-foreground"
        >
          <PlusIcon size={14} />
          New folder
        </button>
      )}

      {editing ? (
        <DetailsDialog
          key={editing.id}
          item={editing}
          folders={folders}
          onClose={() => setEditingId(null)}
          onDeleted={onDeleted}
        />
      ) : null}
    </div>
  );
}
