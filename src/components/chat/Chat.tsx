"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadBody,
  makeConversationId,
  saveConversation,
  useItem,
} from "@/lib/library";
import SettingsView from "@/components/settings/SettingsView";
import QualityView from "./QualityView";
import { useSettings } from "@/components/settings/settings-store";
import { aiPreferences } from "@/lib/settings";
import { scrubMessage } from "@/lib/scrub-client";
import { rehydrate, type VaultEntry } from "@/lib/scrub-types";
import type { Attachment, StreamEvent } from "@/lib/chat-types";
import { MAX_FILES_PER_MESSAGE } from "@/lib/chat-types";
import type { ExtractResponse, NoticeDetails } from "@/lib/notice-types";
import CasePanel from "./CasePanel";
import Composer from "./Composer";
import { DownloadIcon, MenuIcon, PanelIcon, PenIcon } from "./Icons";
import { AssistantMessage, UserMessage } from "./Messages";
import { countdown, formatDate, type DetailsState } from "./notice-utils";
import Sidebar from "./Sidebar";
import UsageMeter from "./UsageMeter";
import { useUsageMeter } from "./usage-store";
import {
  collectDrafts,
  conversationExport,
  conversationTitle,
  documentCount,
  documentNames,
  readFiles,
  type UIMessage,
} from "./types";
import Welcome from "./Welcome";

const TOOL_STATUS: Record<string, string> = {
  lookup_irs_notice: "Looking up the IRS notice…",
};

export default function Chat() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  // What each privacy token stands for. It stays in this browser and is never sent to the AI.
  const [vault, setVault] = useState<VaultEntry[]>([]);
  const vaultRef = useRef<VaultEntry[]>([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const [details, setDetails] = useState<DetailsState>({ status: "idle" });
  const [panelOpen, setPanelOpen] = useState(false);
  const meter = useUsageMeter();
  const { settings } = useSettings();
  const [view, setView] = useState<"chat" | "quality" | "settings">("chat");
  const abortRef = useRef<AbortController | null>(null);
  const extractAbortRef = useRef<AbortController | null>(null);
  const lastExtractFilesRef = useRef<Attachment[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const savedItem = useItem(currentId);
  // What was last written (or just opened), so opening a conversation doesn't re-save it.
  const lastSavedRef = useRef<{
    messages: UIMessage[];
    data: NoticeDetails | null;
  } | null>(null);

  // The conversation as the preparer reads it: tokens in the AI's answers put back to real values.
  const shown = useMemo(
    () =>
      vault.length
        ? messages.map((m) =>
            m.role === "assistant"
              ? { ...m, text: rehydrate(m.text, vault) }
              : m,
          )
        : messages,
    [messages, vault],
  );

  const empty = messages.length === 0;
  const title = empty
    ? null
    : (savedItem?.title ?? conversationTitle(messages));
  const docs = documentCount(messages);
  const drafts = collectDrafts(shown, busy);
  const noticeInfo =
    details.status === "ready" && details.data.isIrsNotice
      ? details.data
      : null;
  const deadline = noticeInfo?.respondBy
    ? countdown(noticeInfo.respondBy, noticeInfo.noticeDate, settings.warnDays)
    : null;
  const reduceMotion =
    settings.motion === "reduced" ||
    (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const readyDetails: NoticeDetails | null =
    details.status === "ready" ? details.data : null;

  // Keep the saved copy up to date once a reply has finished.
  useEffect(() => {
    if (!settings.saveChats || busy || !currentId || messages.length === 0)
      return;
    const last = lastSavedRef.current;
    if (last && last.messages === messages && last.data === readyDetails)
      return;
    lastSavedRef.current = { messages, data: readyDetails };
    void saveConversation(
      currentId,
      { messages, details: readyDetails, vault },
      conversationTitle(messages),
    );
  }, [messages, readyDetails, vault, busy, currentId, settings.saveChats]);

  useEffect(() => {
    if (!settings.autoScroll) return;
    bottomRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, status, settings.autoScroll, reduceMotion]);

  async function addFiles(list: FileList | File[]) {
    setNotice(null);
    const { attachments, errors } = await readFiles(list);
    if (errors.length) setNotice(errors.join(" "));
    setFiles((prev) => {
      const next = [...prev, ...attachments];
      if (next.length > MAX_FILES_PER_MESSAGE) {
        setNotice(`Up to ${MAX_FILES_PER_MESSAGE} files per message.`);
      }
      return next.slice(0, MAX_FILES_PER_MESSAGE);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateLastAssistant(update: (m: UIMessage) => UIMessage) {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") copy[copy.length - 1] = update(last);
      return copy;
    });
  }

  /** Sends `history` (ending with a user message) and streams the reply. */
  async function run(history: UIMessage[]) {
    // A new conversation gets its saved entry right away, so it shows in the sidebar.
    let id = currentId;
    if (!id) {
      id = makeConversationId();
      setCurrentId(id);
    }
    if (settings.saveChats) {
      lastSavedRef.current = { messages: history, data: readyDetails };
      void saveConversation(
        id,
        { messages: history, details: readyDetails, vault: vaultRef.current },
        conversationTitle(history),
      );
    }
    setMessages([...history, { role: "assistant", text: "", tools: [] }]);
    setNotice(null);
    setBusy(true);
    setStatus("Thinking…");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The AI gets the scrubbed version of each of your messages when scrubbing is on.
          messages: history.map(({ role, text, attachments, sent }) => {
            const out = sent ?? { text, attachments };
            return {
              role,
              text: out.text,
              ...(out.attachments?.length
                ? { attachments: out.attachments }
                : {}),
            };
          }),
          // The model chosen in Settings, and the answer style and signing details (left out when default).
          model: settings.model,
          preferences: aiPreferences(settings),
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `Request failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "text") {
            setStatus(null);
            updateLastAssistant((m) => ({ ...m, text: m.text + event.text }));
          } else if (event.type === "status") {
            setStatus(
              event.status === "tool"
                ? (TOOL_STATUS[event.detail ?? ""] ?? "Using a tool…")
                : "Thinking…",
            );
          } else if (event.type === "tool") {
            updateLastAssistant((m) => ({
              ...m,
              tools: [...(m.tools ?? []), event.label],
            }));
          } else if (event.type === "usage") {
            meter.record(event.report);
            updateLastAssistant((m) => ({
              ...m,
              costUsd: event.report.costUsd,
            }));
          } else if (event.type === "error") {
            setNotice(event.message);
          }
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setNotice(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setBusy(false);
      setStatus(null);
      abortRef.current = null;
    }
  }

  /** Reads the notice's key facts for the case panel, alongside the chat reply. */
  async function extract(attachments: Attachment[]) {
    extractAbortRef.current?.abort();
    const controller = new AbortController();
    extractAbortRef.current = controller;
    lastExtractFilesRef.current = attachments;
    // Keep showing the current notice while a new document is read.
    setDetails((prev) =>
      prev.status === "ready" && prev.data.isIrsNotice
        ? prev
        : { status: "loading" },
    );
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachments, model: settings.model }),
        signal: controller.signal,
      });
      const body = await res.json().catch(() => null);
      // Reading the document costs a little too, even when it fails.
      if (body?.usage) meter.record(body.usage);
      if (!res.ok || !body)
        throw new Error(body?.error ?? "Couldn't read the notice details.");
      const { usage: _usage, ...data } = body as ExtractResponse;
      void _usage;
      // A non-notice upload doesn't replace a notice already shown.
      setDetails((prev) =>
        data.isIrsNotice || !(prev.status === "ready" && prev.data.isIrsNotice)
          ? { status: "ready", data }
          : prev,
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      setDetails((prev) =>
        prev.status === "ready" && prev.data.isIrsNotice
          ? prev
          : {
              status: "error",
              message:
                err instanceof Error
                  ? err.message
                  : "Couldn't read the notice details.",
            },
      );
    }
  }

  /**
   * Makes sure every message of yours in `history` has a scrubbed copy, when scrubbing is on.
   * Returns the history with them filled in, or null (with a notice shown) if anything couldn't
   * be scrubbed with confidence: nothing is sent in that case.
   */
  async function scrubHistory(
    history: UIMessage[],
  ): Promise<UIMessage[] | null> {
    if (!settings.scrubUploads) return history;
    let current = vault;
    const out: UIMessage[] = [];
    for (const m of history) {
      if (m.role !== "user" || m.sent) {
        out.push(m);
        continue;
      }
      const r = await scrubMessage(m.text, m.attachments ?? [], current);
      if (!r.ok) {
        const found = r.review
          .slice(0, 3)
          .map((x) => `${x.type}: ${x.text || x.reason}`)
          .join("; ");
        setNotice(found ? `${r.error} (${found})` : r.error);
        return null;
      }
      current = r.vault;
      out.push({ ...m, sent: r.message });
    }
    vaultRef.current = current;
    setVault(current);
    return out;
  }

  async function send(text: string, draftTitle?: string) {
    const trimmed = text.trim();
    if (busy || (!trimmed && files.length === 0)) return;
    const userMessage: UIMessage = {
      role: "user",
      text: trimmed,
      ...(files.length ? { attachments: files } : {}),
      ...(draftTitle ? { draftTitle } : {}),
    };
    setNotice(null);
    setBusy(true);
    setStatus("Hiding client identifiers…");
    const history = await scrubHistory([...messages, userMessage]);
    if (!history) {
      setBusy(false);
      setStatus(null);
      return; // the text and files stay in the box
    }
    const sentFiles = history[history.length - 1].sent?.attachments ?? files;
    if (files.length) {
      if (settings.autoReadNotice) extract(sentFiles);
      else lastExtractFilesRef.current = sentFiles; // so "Read details now" still works
    }
    setInput("");
    setFiles([]);
    run(history);
  }

  async function regenerate() {
    if (busy) return;
    const history =
      messages[messages.length - 1]?.role === "assistant"
        ? messages.slice(0, -1)
        : messages;
    if (!history.length) return;
    setBusy(true);
    setStatus("Hiding client identifiers…");
    const ready = await scrubHistory(history);
    if (!ready) {
      setBusy(false);
      setStatus(null);
      return;
    }
    run(ready);
  }

  function quickAction(prompt: string, draftTitle?: string) {
    if (files.length) {
      send(prompt, draftTitle);
    } else {
      setInput(prompt);
      setNotice("Attach a notice first, or edit the question and press Enter.");
      setFocusKey((k) => k + 1);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function newChat() {
    stop();
    setView("chat");
    meter.startConversation();
    extractAbortRef.current?.abort();
    lastExtractFilesRef.current = null;
    setDetails({ status: "idle" });
    setPanelOpen(false);
    setMessages([]);
    vaultRef.current = [];
    setVault([]);
    setCurrentId(null);
    lastSavedRef.current = null;
    setFiles([]);
    setInput("");
    setNotice(null);
    setDrawerOpen(false);
  }

  /** Opens a saved conversation from the sidebar. */
  async function openConversation(id: string) {
    if (id === currentId && view === "chat") {
      setDrawerOpen(false);
      return;
    }
    stop();
    extractAbortRef.current?.abort();
    const body = await loadBody(id);
    if (!body) {
      setNotice("Couldn't open that conversation. It may have been removed.");
      setView("chat");
      setDrawerOpen(false);
      return;
    }
    const data = body.details && body.details.isIrsNotice ? body.details : null;
    lastSavedRef.current = { messages: body.messages, data };
    const lastWithFiles = [...body.messages]
      .reverse()
      .find((m) => m.attachments?.length);
    lastExtractFilesRef.current = lastWithFiles?.attachments ?? null;
    meter.startConversation();
    setView("chat");
    setCurrentId(id);
    setMessages(body.messages);
    vaultRef.current = body.vault ?? [];
    setVault(body.vault ?? []);
    setDetails(data ? { status: "ready", data } : { status: "idle" });
    setPanelOpen(false);
    setFiles([]);
    setInput("");
    setNotice(null);
    setDrawerOpen(false);
  }

  function conversationDeleted(id: string) {
    if (id === currentId) newChat();
  }

  function exportChat() {
    const file = conversationExport(shown, settings.exportFormat);
    const blob = new Blob([file.content], { type: file.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const composer = (
    <Composer
      value={input}
      onChange={setInput}
      onSubmit={() => send(input)}
      files={files}
      onRemoveFile={(i) => setFiles((prev) => prev.filter((_, j) => j !== i))}
      onAttach={() => fileInputRef.current?.click()}
      busy={busy}
      onStop={stop}
      notice={notice}
      placeholder={
        empty
          ? "Or ask a tax or accounting question…"
          : "Ask a follow-up, or attach another notice…"
      }
      autoFocusKey={focusKey}
    />
  );

  return (
    <div className="ui-shell flex h-dvh text-foreground">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        multiple
        hidden
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />

      <Sidebar
        currentId={currentId}
        onOpen={openConversation}
        onDeleted={conversationDeleted}
        onNewChat={newChat}
        meter={<UsageMeter meter={meter} />}
        onOpenSettings={() => setView("settings")}
        settingsOpen={view === "settings"}
        page={view}
        onSelectPage={(p) => setView(p)}
        className="hidden lg:flex"
      />

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <Sidebar
            currentId={currentId}
            onOpen={openConversation}
            onDeleted={conversationDeleted}
            onNewChat={newChat}
            meter={<UsageMeter meter={meter} />}
            onOpenSettings={() => {
              setView("settings");
              setDrawerOpen(false);
            }}
            settingsOpen={view === "settings"}
            page={view}
            onSelectPage={(p) => {
              setView(p);
              setDrawerOpen(false);
            }}
            onClose={() => setDrawerOpen(false)}
            className="relative flex h-full max-w-[85vw]"
          />
        </div>
      ) : null}

      <main className="ui-main flex min-w-0 flex-1 flex-col">
        {view === "settings" ? (
          <SettingsView onBack={() => setView("chat")} meter={meter} />
        ) : view === "quality" ? (
          <QualityView onBack={() => setView("chat")} />
        ) : (
          <>
            <header
              className={`ui-panel ui-header flex items-center gap-1 border-b border-border bg-surface px-2 py-3 sm:gap-3 lg:px-8 lg:py-4 ${
                empty ? "lg:hidden" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className="flex size-11 items-center justify-center rounded-lg text-text-2 hover:bg-hover lg:hidden"
              >
                <MenuIcon size={20} />
              </button>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <h1 className="truncate text-[0.9375rem] font-semibold tracking-tight lg:text-[1.0625rem]">
                  {title ?? "ProfessioAI"}
                </h1>
                <span className="truncate text-xs text-muted lg:text-[0.8125rem]">
                  {empty ? (
                    "Pilot · test data only"
                  ) : (
                    <>
                      {docs
                        ? `${docs} document${docs === 1 ? "" : "s"} · `
                        : ""}
                      {deadline && noticeInfo?.respondBy ? (
                        <span
                          className={
                            deadline.tone === "ok"
                              ? ""
                              : "font-medium text-warn-strong"
                          }
                        >
                          Respond by{" "}
                          {formatDate(
                            noticeInfo.respondBy,
                            false,
                            settings.dateFormat,
                          )}{" "}
                          · {deadline.label}
                        </span>
                      ) : (
                        "Started today"
                      )}
                    </>
                  )}
                </span>
              </div>
              {!empty ? (
                <button
                  type="button"
                  onClick={exportChat}
                  disabled={busy}
                  aria-label="Export conversation"
                  className="ui-raised ui-pill flex h-10 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-text-2 hover:bg-hover disabled:opacity-50 sm:px-3.5"
                >
                  <DownloadIcon size={16} />
                  <span className="hidden sm:inline">Export</span>
                </button>
              ) : null}
              {!empty ? (
                <button
                  type="button"
                  onClick={() => setPanelOpen(true)}
                  aria-label="Show notice details"
                  className={`flex size-11 items-center justify-center rounded-lg text-text-2 hover:bg-hover ${
                    settings.casePanel === "show" ? "xl:hidden" : ""
                  }`}
                >
                  <PanelIcon size={20} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={newChat}
                aria-label="New conversation"
                className="flex size-11 items-center justify-center rounded-lg text-text-2 hover:bg-hover lg:hidden"
              >
                <PenIcon size={20} />
              </button>
            </header>

            {empty ? (
              <Welcome
                onFiles={addFiles}
                onChooseFile={() => fileInputRef.current?.click()}
                onQuickAction={quickAction}
                composer={composer}
              />
            ) : (
              <>
                <div className="scroll-fade flex-1 overflow-y-auto px-4 pt-6 sm:px-8 sm:pt-8">
                  <div className="mx-auto flex w-full max-w-[var(--chat-width)] flex-col gap-[var(--chat-gap)] pb-10">
                    {shown.map((m, i) =>
                      m.role === "user" ? (
                        <UserMessage key={i} message={m} />
                      ) : (
                        <AssistantMessage
                          key={i}
                          message={m}
                          isLast={i === messages.length - 1}
                          busy={busy}
                          status={status}
                          onPrompt={send}
                          onRegenerate={regenerate}
                        />
                      ),
                    )}
                    <div ref={bottomRef} />
                  </div>
                </div>
                <div className="px-3 pt-3 pb-4 sm:px-8 sm:pt-4 sm:pb-6">
                  <div className="mx-auto max-w-[var(--chat-width)]">
                    {composer}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {!empty && view === "chat" && settings.casePanel === "show" ? (
        <CasePanel
          details={details}
          documents={documentNames(messages)}
          drafts={drafts}
          onRetry={() =>
            lastExtractFilesRef.current && extract(lastExtractFilesRef.current)
          }
          className="hidden xl:flex"
        />
      ) : null}

      {!empty && view === "chat" && panelOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end xl:hidden">
          <button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 bg-black/40"
            onClick={() => setPanelOpen(false)}
          />
          <CasePanel
            details={details}
            documents={documentNames(messages)}
            drafts={drafts}
            onRetry={() =>
              lastExtractFilesRef.current &&
              extract(lastExtractFilesRef.current)
            }
            onClose={() => setPanelOpen(false)}
            className="relative flex h-full max-w-[90vw]"
          />
        </div>
      ) : null}
    </div>
  );
}
