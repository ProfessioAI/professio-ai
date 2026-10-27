"use client";

import type { Attachment } from "./chat-types";
import type {
  ReviewItem,
  ScrubItemIn,
  ScrubResponse,
  VaultEntry,
} from "./scrub-types";

export type ScrubbedMessage = {
  text: string;
  attachments: Attachment[];
  /** How many identifiers were replaced across the text and the files. */
  replaced: number;
};

export type ScrubOutcome =
  | { ok: true; message: ScrubbedMessage; vault: VaultEntry[] }
  | { ok: false; error: string; review: ReviewItem[] };

/**
 * Scrubs a message's text and attached files. Fails closed: if the scrubber is down, or it isn't
 * sure about something, nothing is returned for sending.
 */
export async function scrubMessage(
  text: string,
  attachments: Attachment[],
  vault: VaultEntry[],
): Promise<ScrubOutcome> {
  const items: ScrubItemIn[] = [];
  if (text.trim()) items.push({ id: "text", kind: "text", text });
  attachments.forEach((a, i) =>
    items.push(
      a.mediaType === "application/pdf"
        ? { id: `file-${i}`, kind: "pdf", data: a.data }
        : { id: `file-${i}`, kind: "text", text: a.data },
    ),
  );
  if (items.length === 0)
    return { ok: true, message: { text, attachments, replaced: 0 }, vault };

  let res: Response;
  try {
    res = await fetch("/api/scrub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, vault }),
    });
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the privacy scrubber.",
      review: [],
    };
  }
  const body = (await res.json().catch(() => null)) as
    (ScrubResponse & { error?: string }) | null;
  if (!res.ok || !body || !body.items)
    return {
      ok: false,
      error: body?.error ?? "The privacy scrubber failed, so nothing was sent.",
      review: [],
    };
  if (body.needsReview)
    return {
      ok: false,
      error:
        "Some text can't be scrubbed with confidence, so nothing was sent. Edit it, or turn off scrubbing in Settings if it is test data.",
      review: body.items.flatMap((i) => i.review),
    };

  const byId = new Map(body.items.map((i) => [i.id, i]));
  return {
    ok: true,
    vault: body.vault,
    message: {
      text: byId.get("text")?.text ?? text,
      attachments: attachments.map((a, i) => ({
        name: a.name,
        mediaType: "text/plain" as const,
        data: byId.get(`file-${i}`)?.text ?? "",
      })),
      replaced: body.items.reduce((n, i) => n + i.replaced, 0),
    },
  };
}
