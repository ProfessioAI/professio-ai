"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Attachment, ChatMessage, StreamEvent } from "@/lib/chat-types";
import { MAX_FILE_BYTES, MAX_FILES_PER_MESSAGE } from "@/lib/chat-types";

const STARTERS = [
  "What is a CP2000 notice, and what are the options for responding?",
  "My client got an LT11. What deadlines matter and what should we do first?",
  "Draft a short client email explaining a CP14 balance due notice.",
];

const TOOL_LABELS: Record<string, string> = {
  lookup_irs_notice: "Looking up the IRS notice",
};

async function readAttachment(file: File): Promise<Attachment> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    return { name: file.name, mediaType: "application/pdf", data: dataUrl.split(",")[1] ?? "" };
  }
  return { name: file.name, mediaType: "text/plain", data: await file.text() };
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setNotice(null);
    const next: Attachment[] = [];
    for (const file of Array.from(list)) {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".pdf") && !lower.endsWith(".txt")) {
        setNotice(`${file.name}: only PDF and .txt files are supported for now.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setNotice(`${file.name} is larger than 20 MB.`);
        continue;
      }
      next.push(await readAttachment(file));
    }
    setFiles((prev) => [...prev, ...next].slice(0, MAX_FILES_PER_MESSAGE));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateLastAssistant(update: (m: ChatMessage) => ChatMessage) {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") copy[copy.length - 1] = update(last);
      return copy;
    });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || busy) return;

    const userMessage: ChatMessage = {
      role: "user",
      text: trimmed,
      ...(files.length ? { attachments: files } : {}),
    };
    const history = [...messages, userMessage];
    setMessages([...history, { role: "assistant", text: "" }]);
    setInput("");
    setFiles([]);
    setNotice(null);
    setBusy(true);
    setStatus("Thinking…");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
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
                ? `${TOOL_LABELS[event.detail ?? ""] ?? "Using a tool"}…`
                : "Thinking…",
            );
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

  function stop() {
    abortRef.current?.abort();
  }

  function newChat() {
    stop();
    setMessages([]);
    setFiles([]);
    setNotice(null);
    setInput("");
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">ProfessioAI</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
              Pilot
            </span>
          </div>
          <button
            type="button"
            onClick={newChat}
            className="rounded-md px-3 py-1.5 text-sm text-muted hover:bg-hover hover:text-foreground"
          >
            New chat
          </button>
        </div>
        <div className="border-t border-border bg-warning-bg">
          <p className="mx-auto max-w-3xl px-4 py-2 text-xs leading-relaxed text-warning-fg">
            ProfessioAI writes drafts for review by a qualified professional. It is not tax or
            legal advice. This pilot is for <strong>fictional or public test data only</strong>.
            Don&apos;t upload real client information.
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {empty ? (
            <div className="pt-10">
              <h1 className="text-2xl font-semibold tracking-tight">
                Draft faster on IRS notices
              </h1>
              <p className="mt-2 text-muted">
                Upload a notice (PDF or .txt) or ask a question. ProfessioAI explains what the IRS
                wants, flags deadlines, and drafts responses for your review.
              </p>
              <div className="mt-6 grid gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm hover:bg-hover"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-user-bubble px-4 py-2.5 text-user-bubble-fg">
                      {m.attachments?.length ? (
                        <div className="mb-1.5 flex flex-wrap gap-1.5">
                          {m.attachments.map((a) => (
                            <span
                              key={a.name}
                              className="rounded bg-black/15 px-2 py-0.5 text-xs"
                            >
                              📄 {a.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {m.text ? <p className="whitespace-pre-wrap">{m.text}</p> : null}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="markdown">
                    {m.text ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                    ) : null}
                  </div>
                ),
              )}
              {status ? (
                <p className="animate-pulse text-sm text-muted" aria-live="polite">
                  {status}
                </p>
              ) : null}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="border-t border-border bg-surface">
        <form
          className="mx-auto max-w-3xl px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          {notice ? (
            <p className="mb-2 rounded-md bg-error-bg px-3 py-2 text-sm text-error-fg" role="alert">
              {notice}
            </p>
          ) : null}
          {files.length ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <span
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
                >
                  📄 {f.name}
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="ml-1 text-muted hover:text-foreground"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy || files.length >= MAX_FILES_PER_MESSAGE}
              className="h-10 shrink-0 rounded-lg border border-border px-3 text-sm hover:bg-hover disabled:opacity-50"
              title="Attach a PDF or .txt file"
            >
              Attach
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask about a notice, or attach one…"
              className="max-h-48 min-h-10 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
            />
            {busy ? (
              <button
                type="button"
                onClick={stop}
                className="h-10 shrink-0 rounded-lg border border-border px-4 text-sm hover:bg-hover"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && files.length === 0}
                className="h-10 shrink-0 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg disabled:opacity-50"
              >
                Send
              </button>
            )}
          </div>
        </form>
      </footer>
    </div>
  );
}
