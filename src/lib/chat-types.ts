// Shapes shared by the chat page (browser) and the chat API route (server).

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
  /** A tool finished; `label` is a short description for the chat, e.g. "Looked up CP2000". */
  | { type: "tool"; label: string }
  | { type: "error"; message: string }
  | { type: "done" };

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB per file
export const MAX_FILES_PER_MESSAGE = 5;
