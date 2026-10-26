import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { friendlyError } from "@/lib/api-errors";
import { MAX_FILES_PER_MESSAGE } from "@/lib/chat-types";
import { AttachmentSchema, toDocumentBlocks } from "@/lib/documents";
import type { ExtractResponse, NoticeDetails } from "@/lib/notice-types";
import { reportFromMessage } from "@/lib/usage";

// Reads the key facts off an uploaded notice for the case panel.
// This is a simple, well-defined task, so it runs at low effort.

import { AI_MODEL as MODEL } from "@/lib/config";

const RequestSchema = z.object({
  attachments: z.array(AttachmentSchema).min(1).max(MAX_FILES_PER_MESSAGE),
});

// What Claude must return. Every field is required; null means "not on the notice".
const ExtractionSchema = z.object({
  is_irs_notice: z
    .boolean()
    .describe("True if a document is an IRS notice or letter (including fictional test samples)."),
  notice_code: z
    .string()
    .nullable()
    .describe("Notice or letter code exactly as printed, e.g. 'CP2000', 'LT11', 'Letter 525'."),
  notice_name: z
    .string()
    .nullable()
    .describe("What the notice is about in 2 to 5 words, e.g. 'Underreported income'."),
  tax_year: z.string().nullable().describe("Tax year or period as printed, e.g. '2024'."),
  notice_date: z.string().nullable().describe("Date of the notice, formatted YYYY-MM-DD."),
  respond_by: z
    .string()
    .nullable()
    .describe(
      "Response or payment deadline printed on the notice, formatted YYYY-MM-DD. Null if no date is printed; never calculate one.",
    ),
  amount: z
    .number()
    .nullable()
    .describe("Total amount the notice says is due or proposed, in dollars, e.g. 4016.00."),
  amount_label: z
    .string()
    .nullable()
    .describe("One or two words for that amount, e.g. 'Proposed' or 'Balance due'."),
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const cleanDate = (d: string | null) =>
  d && ISO_DATE.test(d) && !Number.isNaN(Date.parse(d)) ? d : null;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse(
      {
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: "low", format: betaZodOutputFormat(ExtractionSchema) },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system:
          "You read tax documents and copy key facts from them exactly. Only report what is printed in the documents. If several documents are attached, use the main IRS notice.",
        messages: [
          {
            role: "user",
            content: [
              ...toDocumentBlocks(parsed.data.attachments),
              { type: "text", text: "Extract the notice details." },
            ],
          },
        ],
      },
      { signal: req.signal },
    );

    const out = response.parsed_output;
    if (response.stop_reason === "refusal" || !out) {
      return Response.json(
        { error: "Couldn't read details from this document.", usage: reportFromMessage(response) },
        { status: 422 },
      );
    }

    const details: NoticeDetails = {
      isIrsNotice: out.is_irs_notice,
      code: out.notice_code?.trim() || null,
      name: out.notice_name?.trim() || null,
      taxYear: out.tax_year?.trim() || null,
      noticeDate: cleanDate(out.notice_date),
      respondBy: cleanDate(out.respond_by),
      amount: typeof out.amount === "number" && Number.isFinite(out.amount) ? out.amount : null,
      amountLabel: out.amount_label?.trim() || null,
    };
    const body: ExtractResponse = { ...details, usage: reportFromMessage(response) };
    return Response.json(body);
  } catch (err) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    console.error("[api/extract]", err);
    return Response.json({ error: friendlyError(err) }, { status: 502 });
  }
}
