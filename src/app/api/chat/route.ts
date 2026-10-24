import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ChatMessage, StreamEvent } from "@/lib/chat-types";
import { MAX_FILES_PER_MESSAGE } from "@/lib/chat-types";
import { friendlyError } from "@/lib/api-errors";
import { AttachmentSchema, toDocumentBlocks } from "@/lib/documents";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { runTool, toolDefinitions } from "@/lib/tools";

const MODEL = "claude-opus-5-5";
// Effort controls how much the model thinks. "medium" is this model's default;
// raise it for harder research and drafting once you can measure the gain.
const EFFORT = "medium";
// Safety cap on how many tool-call rounds one reply can take.
const MAX_TOOL_ROUNDS = 8;

const RequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(200_000),
        attachments: z.array(AttachmentSchema).max(MAX_FILES_PER_MESSAGE).optional(),
      }),
    )
    .min(1)
    .max(200),
});

function toApiMessages(history: ChatMessage[]): Anthropic.Beta.BetaMessageParam[] {
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of history) {
    if (m.role === "assistant") {
      // Skip empty replies (for example one that failed); the API rejects them.
      if (m.text.trim()) out.push({ role: "assistant", content: m.text });
      continue;
    }
    const content = toDocumentBlocks(m.attachments ?? []);
    content.push({ type: "text", text: m.text.trim() || "Please review the attached document." });
    out.push({ role: "user", content });
  }
  return out;
}

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
  const history = parsed.data.messages;
  if (history[history.length - 1].role !== "user") {
    return Response.json({ error: "The last message must be from the user." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        const client = new Anthropic();
        const messages = toApiMessages(history);
        let wroteText = false;

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const response = client.beta.messages.stream(
            {
              model: MODEL,
              max_tokens: 64000,
              output_config: { effort: EFFORT },
              // If a safety check declines the request, let the API retry it
              // on a suitable fallback model inside the same call.
              betas: ["server-side-fallback-2026-07-01"],
              fallbacks: "default",
              // Caches the system prompt, tools, and earlier turns (including
              // uploaded documents) so follow-up questions cost less.
              cache_control: { type: "ephemeral" },
              system: SYSTEM_PROMPT,
              tools: toolDefinitions,
              messages,
            },
            { signal: req.signal },
          );

          let separatorPending = wroteText && round > 0;
          for await (const event of response) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "thinking") {
                send({ type: "status", status: "thinking" });
              } else if (event.content_block.type === "tool_use") {
                send({ type: "status", status: "tool", detail: event.content_block.name });
              }
            } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              if (separatorPending) {
                send({ type: "text", text: "\n\n" });
                separatorPending = false;
              }
              send({ type: "text", text: event.delta.text });
              wroteText = true;
            }
          }

          const message = await response.finalMessage();

          if (message.stop_reason === "refusal") {
            send({
              type: "error",
              message: "The AI declined to answer this request. Try rephrasing it.",
            });
            break;
          }

          // A server-side step paused; send the partial turn back to continue it.
          if (message.stop_reason === "pause_turn") {
            messages.push({ role: "assistant", content: message.content });
            continue;
          }

          const toolUses = message.content.filter(
            (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
          );

          if (toolUses.length === 0) {
            if (message.stop_reason === "max_tokens") {
              send({ type: "error", message: "The reply hit its length limit and was cut off." });
            }
            break;
          }

          // A tool call cut off by the length limit may have incomplete input.
          if (message.stop_reason === "max_tokens") {
            send({ type: "error", message: "The reply hit its length limit mid tool call." });
            break;
          }

          messages.push({ role: "assistant", content: message.content });
          const results = await Promise.all(
            toolUses.map(async (t): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
              const { label, ...result } = await runTool(t.name, t.input);
              if (label) send({ type: "tool", label });
              return { type: "tool_result", tool_use_id: t.id, ...result };
            }),
          );
          // All results go back together in a single user message.
          messages.push({ role: "user", content: results });

          if (round === MAX_TOOL_ROUNDS - 1) {
            send({ type: "error", message: "Stopped after too many tool calls in one reply." });
          }
        }

        send({ type: "done" });
      } catch (err) {
        if (!req.signal.aborted) {
          console.error("[api/chat]", err);
          send({ type: "error", message: friendlyError(err) });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed because the browser disconnected.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
