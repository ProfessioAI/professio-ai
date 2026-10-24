import type { Attachment, ChatMessage } from "@/lib/chat-types";
import { MAX_FILE_BYTES } from "@/lib/chat-types";

/** A chat message plus what only the page needs (tool activity). */
export type UIMessage = ChatMessage & { tools?: string[] };

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
      errors.push(`${file.name}: only PDF and .txt files are supported for now.`);
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
      attachments.push({ name: file.name, mediaType: "text/plain", data: await file.text() });
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
    for (const a of m.attachments ?? []) lines.push(`_Attached: ${a.name}_`, "");
    if (m.text.trim()) lines.push(m.text.trim(), "");
  }
  return lines.join("\n");
}
