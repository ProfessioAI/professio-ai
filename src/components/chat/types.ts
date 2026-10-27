import type { Attachment, ChatMessage } from "@/lib/chat-types";
import { MAX_FILE_BYTES } from "@/lib/chat-types";
import type { ExportFormat } from "@/lib/settings";
import type { ScrubbedMessage } from "@/lib/scrub-client";
import type { SkillId, SkillUse } from "@/lib/skills";

/**
 * A chat message plus what only the page needs: tool activity, and for a
 * user message that asked for a letter or checklist, the draft's title.
 */
export type UIMessage = ChatMessage & {
  /** Older saved answers listed tools as plain text; newer ones use `skills`. */
  tools?: string[];
  /** The skills this answer used, for the skills row. */
  skills?: SkillUse[];
  /** A skill the preparer picked for this request (user messages). */
  skill?: SkillId;
  draftTitle?: string;
  /** Estimated cost of this reply in dollars (assistant messages). */
  costUsd?: number;
  /** A user message as it was sent to the AI, with identifiers replaced by tokens. */
  sent?: ScrubbedMessage;
};

export type Draft = { title: string; text: string };

/** Replies to "draft" requests, once they've finished streaming. */
export function collectDrafts(
  messages: UIMessage[],
  streaming: boolean,
): Draft[] {
  const drafts: Draft[] = [];
  messages.forEach((m, i) => {
    const reply = messages[i + 1];
    const replyDone = !(streaming && i + 1 === messages.length - 1);
    if (
      m.role === "user" &&
      m.draftTitle &&
      reply?.role === "assistant" &&
      reply.text.trim() &&
      replyDone
    ) {
      drafts.push({ title: m.draftTitle, text: reply.text.trim() });
    }
  });
  return drafts;
}

/** Names of every document attached in the conversation, without repeats. */
export function documentNames(messages: UIMessage[]): string[] {
  return [
    ...new Set(
      messages.flatMap((m) => m.attachments?.map((a) => a.name) ?? []),
    ),
  ];
}

export function conversationTitle(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New conversation";
  const text = first.text.trim().replace(/\s+/g, " ");
  if (text) return text.length > 60 ? `${text.slice(0, 57)}…` : text;
  return first.attachments?.[0]?.name ?? "New conversation";
}

export function documentCount(messages: UIMessage[]): number {
  return messages.reduce((n, m) => n + (m.attachments?.length ?? 0), 0);
}

/** Reads dropped or chosen files. PDFs become base64; .txt files become text. */
export async function readFiles(
  list: FileList | File[],
): Promise<{ attachments: Attachment[]; errors: string[] }> {
  const attachments: Attachment[] = [];
  const errors: string[] = [];
  for (const file of Array.from(list)) {
    const lower = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");
    const isTxt = file.type === "text/plain" || lower.endsWith(".txt");
    if (!isPdf && !isTxt) {
      errors.push(
        `${file.name}: only PDF and .txt files are supported for now.`,
      );
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      errors.push(`${file.name} is larger than 20 MB.`);
      continue;
    }
    if (isPdf) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      attachments.push({
        name: file.name,
        mediaType: "application/pdf",
        data: dataUrl.split(",")[1] ?? "",
      });
    } else {
      attachments.push({
        name: file.name,
        mediaType: "text/plain",
        data: await file.text(),
      });
    }
  }
  return { attachments, errors };
}

/** The conversation as a Markdown file, for the Export button. */
export function conversationMarkdown(messages: UIMessage[]): string {
  const lines = [
    `# ${conversationTitle(messages)}`,
    "",
    `Exported from ProfessioAI on ${new Date().toLocaleString()}.`,
    "Draft for professional review. Not tax or legal advice.",
    "",
  ];
  for (const m of messages) {
    if (!m.text.trim() && !m.attachments?.length) continue;
    lines.push(m.role === "user" ? "## You" : "## ProfessioAI", "");
    for (const a of m.attachments ?? [])
      lines.push(`_Attached: ${a.name}_`, "");
    if (m.text.trim()) lines.push(m.text.trim(), "");
  }
  return lines.join("\n");
}

/** Markdown turned into readable plain text: no symbols for bold, headings, quotes, or tables. */
function plainText(markdown: string): string {
  return markdown
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, "") // table divider rows
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/^\s*\|(.*)\|\s*$/gm, (_, row: string) =>
      row
        .split("|")
        .map((c) => c.trim())
        .join("  |  "),
    )
    .replace(/\n{3,}/g, "\n\n");
}

/** The conversation as a downloadable file, in the format chosen in settings. */
export function conversationExport(
  messages: UIMessage[],
  format: ExportFormat,
) {
  const markdown = conversationMarkdown(messages);
  if (format === "text") {
    return {
      filename: "professioai-conversation.txt",
      mime: "text/plain",
      content: plainText(markdown),
    };
  }
  return {
    filename: "professioai-conversation.md",
    mime: "text/markdown",
    content: markdown,
  };
}
