import { z } from "zod";
import type {
  ScrubItemOut,
  ScrubResponse,
  VaultEntry,
} from "@/lib/scrub-types";

// Sends text and PDFs to the privacy scrubber running on this computer (services/scrubber) and
// returns them with client identifiers replaced by tokens. If the scrubber isn't running the
// answer is an error, never the original text: nothing may reach the AI unscrubbed.

const SCRUBBER_URL = process.env.SCRUBBER_URL ?? "http://127.0.0.1:5002";

const VaultSchema = z.array(
  z.object({
    token: z.string().max(60),
    type: z.string().max(30),
    original: z.string().max(2000),
  }),
);

const RequestSchema = z.object({
  items: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({
          id: z.string().max(200),
          kind: z.literal("text"),
          text: z.string().max(2_000_000),
        }),
        z.object({
          id: z.string().max(200),
          kind: z.literal("pdf"),
          data: z.string().max(30_000_000),
        }),
      ]),
    )
    .min(1)
    .max(12),
  vault: VaultSchema.default([]),
});

type ServiceReply = {
  text: string;
  entities: { count: number }[];
  review: ScrubItemOut["review"];
  needsReview: boolean;
  vault: VaultEntry[];
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Request body must be JSON." },
      { status: 400 },
    );
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 },
    );
  }

  let vault: VaultEntry[] = parsed.data.vault;
  const items: ScrubItemOut[] = [];
  let needsReview = false;
  try {
    // One at a time, so a person named in the first file gets the same token in the second.
    for (const item of parsed.data.items) {
      const res = await fetch(
        `${SCRUBBER_URL}/${item.kind === "pdf" ? "scrub-pdf" : "scrub"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            item.kind === "pdf"
              ? { data: item.data, vault }
              : { text: item.text, vault },
          ),
          signal: AbortSignal.timeout(120_000),
        },
      );
      if (!res.ok) throw new Error(`scrubber answered ${res.status}`);
      const r = (await res.json()) as ServiceReply;
      vault = r.vault;
      needsReview ||= r.needsReview;
      items.push({
        id: item.id,
        // Text that needs review is withheld, so it can't be sent on by mistake.
        text: r.needsReview ? "" : r.text,
        replaced: r.entities.reduce((n, e) => n + e.count, 0),
        review: r.review,
      });
    }
  } catch (err) {
    console.error("[api/scrub]", err);
    return Response.json(
      {
        error:
          "The privacy scrubber isn't running, so nothing was sent. Start it with: npm run scrubber",
      },
      { status: 503 },
    );
  }
  return Response.json({ items, vault, needsReview } satisfies ScrubResponse);
}
