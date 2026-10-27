import { z } from "zod";
import {
  addDays,
  daysBetween,
  holidayName,
  longDate,
  nextBusinessDay,
  weekdayOf,
} from "../skills-math";
import { dateToIso } from "../scrub-types";
import { defineTool } from "./define-tool";
import type { ToolContext } from "./context";

// The "Dates" skill: weekdays, day counts, and deadlines that roll past weekends and holidays.
// Dates hidden from the AI arrive as tokens like [DATE_1] and are worked out here with their real
// values. A date that comes out of a calculation goes back as a new hidden date.

const Input = z.object({
  operation: z.enum([
    "weekday",
    "add_days",
    "days_between",
    "next_business_day",
  ]),
  date: z.string().min(1).max(60),
  other_date: z.string().max(60).optional(),
  days: z.number().int().min(-3700).max(3700).optional(),
});

/** A date given as a token, as written ("October 31, 2026"), or as YYYY-MM-DD. */
function resolve(
  text: string,
  ctx: ToolContext,
): { iso: string; hidden: boolean } {
  const t = text.trim();
  if (/^\[DATE_\d+\]$/.test(t)) {
    const iso = ctx.date(t);
    if (!iso) throw new Error(`Don't know the date ${t}`);
    return { iso, hidden: true };
  }
  const iso = dateToIso(t);
  if (!iso) throw new Error(`Can't read "${text}" as a date`);
  return { iso, hidden: false };
}

export const checkDates = defineTool(
  {
    name: "check_dates",
    description:
      "Works out weekdays, day counts, and deadlines exactly. Use it for every weekday, 'how many days', 'N days from', or 'next business day' question instead of working dates out yourself. Hidden dates (tokens like [DATE_1]) can be passed as the date. A date that results from a calculation is returned as a new token such as [DATE_5]; use that token in your answer. next_business_day moves a date that falls on a weekend or a federal holiday forward, the way IRS deadlines roll.",
    input_schema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["weekday", "add_days", "days_between", "next_business_day"],
        },
        date: {
          type: "string",
          description: "A date, or a hidden-date token like [DATE_1].",
        },
        other_date: {
          type: "string",
          description:
            "For days_between: the later date (days_between counts from date to other_date).",
        },
        days: {
          type: "integer",
          description:
            "For add_days: how many days to add (negative to go back).",
        },
      },
      required: ["operation", "date"],
    },
  },
  Input,
  (input, ctx) => {
    const a = resolve(input.date, ctx);
    const out = (iso: string, hide: boolean) =>
      hide ? ctx.hide("DATE", longDate(iso)) : longDate(iso);
    switch (input.operation) {
      case "weekday": {
        const h = holidayName(a.iso);
        return `${input.date} is a ${weekdayOf(a.iso)}${h ? ` and a federal holiday (${h})` : ""}.`;
      }
      case "add_days": {
        if (input.days === undefined) throw new Error("add_days needs days");
        const r = addDays(a.iso, input.days);
        const h = holidayName(r);
        return `${input.date} plus ${input.days} days is ${out(r, a.hidden)}, a ${weekdayOf(r)}${h ? ` (federal holiday: ${h})` : ""}.`;
      }
      case "days_between": {
        if (!input.other_date) throw new Error("days_between needs other_date");
        const b = resolve(input.other_date, ctx);
        return `${daysBetween(a.iso, b.iso)} days from ${input.date} to ${input.other_date}.`;
      }
      default: {
        const r = nextBusinessDay(a.iso);
        return r.date === a.iso
          ? `${input.date} is already a business day (${weekdayOf(a.iso)}).`
          : `${input.date} falls on a non-business day (${r.skipped.length ? "weekend or holiday" : ""}). The next business day is ${out(r.date, a.hidden)}, a ${weekdayOf(r.date)}.`;
      }
    }
  },
  (input) => {
    const what = {
      weekday: `Checked the weekday of ${input.date}`,
      add_days: `Counted ${input.days ?? 0} days from ${input.date}`,
      days_between: `Counted the days from ${input.date} to ${input.other_date ?? "?"}`,
      next_business_day: `Checked the next business day after ${input.date}`,
    } as const;
    return what[input.operation];
  },
  "dates",
);
