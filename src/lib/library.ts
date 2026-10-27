"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { NoticeDetails } from "./notice-types";
import type { VaultEntry } from "./scrub-types";
import type { UIMessage } from "@/components/chat/types";

// Saved conversations live in this browser only. The small list (titles, descriptions, icons,
// folders) is in localStorage so the sidebar can read it at once; each conversation's messages
// and attached documents are in IndexedDB, which can hold large PDFs. Nothing is sent anywhere.
// Per-account storage comes later, with sign-in.

const KEY = "professioai.library.v1";
const DB_NAME = "professioai";
const STORE = "conversations";

export const ICON_IDS = [
  "doc",
  "chat",
  "calendar",
  "star",
  "flag",
  "alert",
  "dollar",
  "briefcase",
  "clock",
  "user",
  "building",
  "scale",
] as const;
export type ConversationIcon = (typeof ICON_IDS)[number];

export const LIMITS = { title: 80, description: 300, folder: 40, items: 300 };

export type Folder = { id: string; name: string; open: boolean };

export type LibraryItem = {
  id: string;
  title: string;
  /** True once the person has renamed it; otherwise the title follows the first question. */
  customTitle: boolean;
  description: string;
  icon: ConversationIcon;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Library = { folders: Folder[]; items: LibraryItem[] };

export type SavedBody = {
  messages: UIMessage[];
  details: NoticeDetails | null;
  /** What each privacy token stands for. Kept only in this browser. */
  vault?: VaultEntry[];
};

const EMPTY: Library = { folders: [], items: [] };

// --- the small list ---------------------------------------------------------

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const str = (v: unknown, max: number, fallback = "") =>
  typeof v === "string" ? v.slice(0, max) : fallback;

/** Reads the stored list, dropping anything that isn't the expected shape. */
function parse(raw: string | null): Library {
  if (!raw) return EMPTY;
  try {
    const r = JSON.parse(raw) as Partial<Library>;
    const folders: Folder[] = (Array.isArray(r.folders) ? r.folders : [])
      .filter((f) => f && typeof f.id === "string")
      .map((f) => ({
        id: f.id,
        name: str(f.name, LIMITS.folder, "Folder") || "Folder",
        open: f.open !== false,
      }));
    const ids = new Set(folders.map((f) => f.id));
    const items: LibraryItem[] = (Array.isArray(r.items) ? r.items : [])
      .filter((i) => i && typeof i.id === "string")
      .map((i) => ({
        id: i.id,
        title: str(i.title, LIMITS.title, "Conversation") || "Conversation",
        customTitle: i.customTitle === true,
        description: str(i.description, LIMITS.description),
        icon: ICON_IDS.includes(i.icon) ? i.icon : "doc",
        folderId: i.folderId && ids.has(i.folderId) ? i.folderId : null,
        createdAt: str(i.createdAt, 40, new Date(0).toISOString()),
        updatedAt: str(i.updatedAt, 40, new Date(0).toISOString()),
      }));
    return { folders, items };
  } catch {
    return EMPTY;
  }
}

function write(lib: Library): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(lib));
  } catch {
    return false; // Storage full or blocked.
  }
  notify();
  return true;
}

/** The latest list, read fresh so two tabs don't overwrite each other. */
const current = () => parse(readRaw());

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// --- the bodies (IndexedDB) -----------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Saving isn't available in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadBody(id: string): Promise<SavedBody | null> {
  try {
    const body = await withStore<SavedBody | undefined>("readonly", (s) =>
      s.get(id),
    );
    return body && Array.isArray(body.messages) ? body : null;
  } catch {
    return null;
  }
}

// --- actions (usable anywhere) ----------------------------------------------------------

/** Saves a conversation's messages and keeps its entry in the list up to date. */
export async function saveConversation(
  id: string,
  body: SavedBody,
  autoTitle: string,
): Promise<boolean> {
  try {
    // Documents are stored with the messages so follow-up questions still work after a reload.
    await withStore("readwrite", (s) => s.put(body, id));
  } catch {
    return false;
  }
  const lib = current();
  const now = new Date().toISOString();
  const existing = lib.items.find((i) => i.id === id);
  const items = existing
    ? lib.items.map((i) =>
        i.id === id
          ? {
              ...i,
              updatedAt: now,
              title: i.customTitle ? i.title : autoTitle.slice(0, LIMITS.title),
            }
          : i,
      )
    : [
        {
          id,
          title: autoTitle.slice(0, LIMITS.title) || "Conversation",
          customTitle: false,
          description: "",
          icon: "doc" as const,
          folderId: null,
          createdAt: now,
          updatedAt: now,
        },
        ...lib.items,
      ].slice(0, LIMITS.items);
  return write({ ...lib, items });
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.delete(id));
  } catch {
    // The list entry still goes.
  }
  const lib = current();
  write({ ...lib, items: lib.items.filter((i) => i.id !== id) });
}

/** Removes every saved conversation and folder from this browser. */
export async function clearLibrary(): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.clear());
  } catch {
    // Nothing stored.
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
  notify();
}

export type ItemPatch = Partial<
  Pick<LibraryItem, "title" | "description" | "icon" | "folderId">
>;

export function updateItem(id: string, patch: ItemPatch) {
  const lib = current();
  const ids = new Set(lib.folders.map((f) => f.id));
  write({
    ...lib,
    items: lib.items.map((i) => {
      if (i.id !== id) return i;
      const next = { ...i };
      if (patch.title !== undefined) {
        const t = patch.title.trim().slice(0, LIMITS.title);
        // An empty title goes back to following the first question.
        if (t) {
          next.title = t;
          next.customTitle = true;
        } else next.customTitle = false;
      }
      if (patch.description !== undefined)
        next.description = patch.description
          .trim()
          .slice(0, LIMITS.description);
      if (patch.icon && ICON_IDS.includes(patch.icon)) next.icon = patch.icon;
      if (patch.folderId !== undefined)
        next.folderId =
          patch.folderId && ids.has(patch.folderId) ? patch.folderId : null;
      return next;
    }),
  });
}

export function createFolder(name: string): string | null {
  const n = name.trim().slice(0, LIMITS.folder);
  if (!n) return null;
  const lib = current();
  const id = newId();
  write({ ...lib, folders: [...lib.folders, { id, name: n, open: true }] });
  return id;
}

export function renameFolder(id: string, name: string) {
  const n = name.trim().slice(0, LIMITS.folder);
  if (!n) return;
  const lib = current();
  write({
    ...lib,
    folders: lib.folders.map((f) => (f.id === id ? { ...f, name: n } : f)),
  });
}

export function toggleFolder(id: string) {
  const lib = current();
  write({
    ...lib,
    folders: lib.folders.map((f) =>
      f.id === id ? { ...f, open: !f.open } : f,
    ),
  });
}

/** Deleting a folder keeps its conversations; they move back to the main list. */
export function deleteFolder(id: string) {
  const lib = current();
  write({
    folders: lib.folders.filter((f) => f.id !== id),
    items: lib.items.map((i) =>
      i.folderId === id ? { ...i, folderId: null } : i,
    ),
  });
}

export const makeConversationId = newId;

/** The saved list, newest first. Empty on the server and during the first render. */
export function useLibrary(): Library {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const lib = useMemo(() => parse(raw), [raw]);
  return useMemo(
    () => ({
      folders: lib.folders,
      items: [...lib.items].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      ),
    }),
    [lib],
  );
}

/** Stable handle to look up one entry without re-rendering on every change. */
export function useItem(id: string | null): LibraryItem | null {
  const { items } = useLibrary();
  return useMemo(
    () => (id ? (items.find((i) => i.id === id) ?? null) : null),
    [items, id],
  );
}
