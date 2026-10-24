import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export type ToolResult = {
  content: string;
  is_error?: boolean;
  /** Short description shown in the chat, e.g. "Looked up CP2000 in the notice reference". */
  label?: string;
};

/** A tool ("API link") the assistant can call during a chat. */
export type AppTool = {
  definition: Anthropic.Beta.BetaTool;
  run: (rawInput: unknown) => Promise<ToolResult>;
};

/**
 * Wraps a tool so its input is checked against the Zod schema before the
 * handler runs, and so errors come back to the model instead of crashing
 * the request. The JSON schema in `definition` is what the model sees; keep
 * it in sync with the Zod schema. `label` describes a successful call for
 * the chat page.
 */
export function defineTool<S extends z.ZodType>(
  definition: Anthropic.Beta.BetaTool,
  schema: S,
  handler: (input: z.infer<S>) => Promise<string> | string,
  label?: (input: z.infer<S>) => string,
): AppTool {
  return {
    definition,
    async run(rawInput) {
      const parsed = schema.safeParse(rawInput);
      if (!parsed.success) {
        return {
          content: `Invalid tool input: ${z.prettifyError(parsed.error)}`,
          is_error: true,
        };
      }
      try {
        return {
          content: await handler(parsed.data),
          ...(label ? { label: label(parsed.data) } : {}),
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: `Tool failed: ${message}`, is_error: true };
      }
    },
  };
}
