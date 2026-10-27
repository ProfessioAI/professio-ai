import type { AppTool, ToolResult } from "./define-tool";
import { calculate } from "./calculate";
import { checkDates } from "./check-dates";
import type { ToolContext } from "./context";
import { irsNoticeLookup } from "./irs-notice-lookup";

// Every tool the assistant can use. To add an API link, create a file next to
// this one with defineTool(...) and add it to this list.
const TOOLS: AppTool[] = [irsNoticeLookup, calculate, checkDates];

export const toolDefinitions = TOOLS.map((t) => t.definition);

/** The skill a tool belongs to, by tool name. */
export const toolSkill = (name: string) =>
  TOOLS.find((t) => t.definition.name === name)?.skill;

export async function runTool(
  name: string,
  input: unknown,
  ctx: ToolContext,
): Promise<ToolResult> {
  const tool = TOOLS.find((t) => t.definition.name === name);
  if (!tool) return { content: `Unknown tool: ${name}`, is_error: true };
  return tool.run(input, ctx);
}
