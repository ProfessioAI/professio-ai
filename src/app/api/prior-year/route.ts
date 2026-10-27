import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { friendlyError } from "@/lib/api-errors";
import { MAX_FILES_PER_MESSAGE } from "@/lib/chat-types";
import { AttachmentSchema, toDocumentBlocks } from "@/lib/documents";
import { DEFAULT_MODEL, MODEL_IDS, modelInfo } from "@/lib/models";
import { PRIOR_YEAR_PROMPT } from "@/lib/prior-year-prompt";
import { reportToMarkdown } from "@/lib/prior-year-render";
import {
  CARRYOVER_TYPES,
  FIGURE_FIELDS,
  type PriorYearReport,
  type PriorYearResponse,
} from "@/lib/prior-year-types";
import { reportFromMessage } from "@/lib/usage";

// Reads a filed return and its papers into a structured report: figures with their page and line,
// what carries into the next year, what is missing, and where the return and the IRS transcript
// disagree. Read-only; nothing is written to any tax software.

const RequestSchema = z.object({
  model: z.enum(MODEL_IDS).optional(),
  attachments: z.array(AttachmentSchema).min(1).max(MAX_FILES_PER_MESSAGE),
});

const Figure = z.object({
  value: z.number().nullable(),
  page: z.number().int().nullable(),
  line: z.string().nullable(),
});

const ReportSchema = z.object({
  tax_year: z.string().nullable(),
  filing_status: z.string().nullable(),
  preparer: z
    .string()
    .nullable()
    .describe("Preparer or firm named on the return, or null."),
  figures: z.object(
    Object.fromEntries(FIGURE_FIELDS.map((f) => [f, Figure])) as Record<
      (typeof FIGURE_FIELDS)[number],
      typeof Figure
    >,
  ),
  carryovers: z.array(
    z.object({
      type: z.enum(CARRYOVER_TYPES),
      description: z.string(),
      amount: z.number().nullable(),
      status: z.enum(["found", "unknown"]),
      document: z.string().nullable(),
      page: z.number().int().nullable(),
      line: z.string().nullable(),
      note: z.string(),
    }),
  ),
  missing_items: z.array(
    z.object({
      item: z.string(),
      kind: z.enum(["document", "schedule", "information"]),
      reason: z.string(),
    }),
  ),
  conflicts: z.array(
    z.object({
      description: z.string(),
      return_value: z.number().nullable(),
      other_value: z.number().nullable(),
      other_source: z.string(),
    }),
  ),
  confirm: z.array(z.string()),
  client_email: z.string(),
});

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
  const model = parsed.data.model ?? DEFAULT_MODEL;
  const { serverFallback } = modelInfo(model);

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse(
      {
        model,
        max_tokens: 16000,
        output_config: {
          effort: "medium",
          format: betaZodOutputFormat(ReportSchema),
        },
        ...(serverFallback
          ? {
              betas: ["server-side-fallback-2026-07-01"],
              fallbacks: "default" as const,
            }
          : {}),
        system: PRIOR_YEAR_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              ...toDocumentBlocks(parsed.data.attachments),
              {
                type: "text",
                text: "Read these files and fill in the report.",
              },
            ],
          },
        ],
      },
      { signal: req.signal },
    );

    const out = response.parsed_output;
    if (response.stop_reason === "refusal" || !out) {
      return Response.json(
        {
          error: "Couldn't read this return.",
          usage: reportFromMessage(response),
        },
        { status: 422 },
      );
    }

    const report: PriorYearReport = {
      taxYear: out.tax_year,
      filingStatus: out.filing_status,
      preparer: out.preparer,
      figures: out.figures,
      carryovers: out.carryovers,
      missingItems: out.missing_items,
      conflicts: out.conflicts.map((c) => ({
        description: c.description,
        returnValue: c.return_value,
        otherValue: c.other_value,
        otherSource: c.other_source,
      })),
      confirm: out.confirm,
      clientEmail: out.client_email,
    };
    const result: PriorYearResponse = {
      report,
      markdown: reportToMarkdown(report),
      usage: reportFromMessage(response),
    };
    return Response.json(result);
  } catch (err) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    console.error("[api/prior-year]", err);
    return Response.json({ error: friendlyError(err) }, { status: 502 });
  }
}
