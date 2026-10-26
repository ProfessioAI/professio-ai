import type { AppTool, ToolResult } from "./define-tool";
import { irsNoticeLookup } from "./irs-notice-lookup";

// Every tool the assistant can use. To add an API link, create a file next to
// this one with defineTool(...) and add it to this list.
const TOOLS: AppTool[] = [irsNoticeLookup];

export const toolDefinitions = TOOLS.map((t) => t.definition);

export async function runTool(
  name: string,
  input: unknown,
): Promise<ToolResult> {
  const tool = TOOLS.find((t) => t.definition.name === name);
  if (!tool) return { content: `Unknown tool: ${name}`, is_error: true };
  return tool.run(input);
}
