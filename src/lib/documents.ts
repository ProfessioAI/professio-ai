import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Attachment } from "./chat-types";

// Base64 is about 4/3 the size of the file, so 30M characters ~ a 22 MB file.
export const AttachmentSchema = z.object({
  name: z.string().min(1).max(200),
  mediaType: z.enum(["application/pdf", "text/plain"]),
  data: z.string().min(1).max(30_000_000),
});

/** Turns uploaded files into document blocks Claude can read. */
export function toDocumentBlocks(
  attachments: Attachment[],
): Anthropic.Beta.BetaContentBlockParam[] {
  return attachments.map((a) => ({
    type: "document",
    title: a.name,
    source:
      a.mediaType === "application/pdf"
        ? { type: "base64", media_type: "application/pdf", data: a.data }
        : { type: "text", media_type: "text/plain", data: a.data },
  }));
}
