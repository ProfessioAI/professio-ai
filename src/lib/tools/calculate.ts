import { z } from "zod";
import { evaluate, formatMoney } from "../skills-math";
import { defineTool } from "./define-tool";

// The "Calculate" skill: exact arithmetic, so the assistant never does sums in its head.
// Amounts hidden from the AI arrive as tokens like [AMOUNT_1]. They are worked out here with their
// real values, and a result built from hidden amounts goes back as a new hidden amount.

const Input = z.object({
  expression: z
    .string()
    .min(1)
    .max(400)
    .describe(
      "Arithmetic using numbers, [AMOUNT_n] tokens, + - * / ^ ( ), a trailing %, and round(x, places), abs, min, max. Example: round([AMOUNT_1] * 20%, 2)",
    ),
  result_is: z
    .enum(["money", "number"])
    .describe(
      '"money" for a dollar amount, "number" for a rate, count, or ratio.',
    ),
});

export const calculate = defineTool(
  {
    name: "calculate",
    description:
      "Does exact arithmetic. Use it for every sum, difference, percentage, penalty, or total instead of calculating yourself. Hidden amounts (tokens like [AMOUNT_1]) can be used in the expression. A money result built from hidden amounts is returned as a new token such as [AMOUNT_7]; use that token in your answer.",
    input_schema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description:
            "Arithmetic using numbers, [AMOUNT_n] tokens, + - * / ^ ( ), a trailing %, and round(x, places), abs, min, max. Example: round([AMOUNT_1] * 20%, 2)",
        },
        result_is: {
          type: "string",
          enum: ["money", "number"],
          description:
            '"money" for a dollar amount, "number" for a rate, count, or ratio.',
        },
      },
      required: ["expression", "result_is"],
    },
  },
  Input,
  (input, ctx) => {
    const usedToken = /\[[A-Z]+_\d+\]/.test(input.expression);
    const value = evaluate(input.expression, (t) => ctx.amount(t));
    const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
    if (input.result_is === "money" && usedToken) {
      const token = ctx.hide("AMOUNT", formatMoney(rounded));
      return `${input.expression} = ${token} (a hidden amount; refer to it by this token)`;
    }
    const shown =
      input.result_is === "money"
        ? formatMoney(rounded)
        : String(Math.round(value * 1e6) / 1e6);
    return `${input.expression} = ${shown}`;
  },
  (input) => `Calculated ${input.expression}`,
  "calculate",
);
