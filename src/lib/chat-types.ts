// Shapes shared by the chat page (browser) and the chat API route (server).

import type { SkillUse } from "./skills";
import type { VaultEntry } from "./scrub-types";
import type { UsageReport } from "./usage";

export type AttachmentMediaType = "application/pdf" | "text/plain";

export type Attachment = {
  name: string;
  mediaType: AttachmentMediaType;
  /** Base64 for PDFs, raw text for plain-text files. */
  data: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  attachments?: Attachment[];
};

/** One line of the newline-delimited JSON stream sent by /api/chat. */
export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "status"; status: "thinking" | "tool"; detail?: string }
  /** A skill was used; shown in the skills row under the answer. */
  | { type: "skill"; skill: SkillUse }
  /** New hidden values (tokens) made by a skill, for the browser to keep in its vault. */
  | { type: "vault"; entries: VaultEntry[] }
  /** What the whole reply used, sent once at the end. */
  | { type: "usage"; report: UsageReport }
  | { type: "error"; message: string }
  | { type: "done" };

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB per file
export const MAX_FILES_PER_MESSAGE = 5;
