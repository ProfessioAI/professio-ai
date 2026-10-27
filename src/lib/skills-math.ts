// The exact math and date logic behind the calculate and check_dates skills. Pure functions with
// no imports, so they can be tested on their own (npm run skills:test).

// --- calculator -------------------------------------------------------------------------

type Tok =
  { t: "num"; v: number } | { t: "op"; v: string } | { t: "fn"; v: string };

/**
 * Works out an arithmetic expression: numbers, + - * / ^ ( ), a trailing %, and round(x, places),
 * abs(x), min(a, b), max(a, b). `resolve` turns a token like [AMOUNT_1] into its number.
 * Throws a plain-language Error for anything else, so it is safe on text from the AI.
 */
export function evaluate(
  expr: string,
  resolve: (token: string) => number | null,
): number {
  const toks: Tok[] = [];
  const src = expr.trim();
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
    } else if (c === "[") {
      const m = /^\[[A-Z]+_\d+(?:_[A-Z]+)?\]/.exec(src.slice(i));
      if (!m) throw new Error(`Unexpected "[" at position ${i}`);
      const v = resolve(m[0]);
      if (v === null) throw new Error(`Don't know the value of ${m[0]}`);
      toks.push({ t: "num", v });
      i += m[0].length;
    } else if (/[0-9.$]/.test(c)) {
      const m = /^\$?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)/.exec(
        src.slice(i),
      );
      if (!m) throw new Error(`Unexpected "${c}" at position ${i}`);
      toks.push({ t: "num", v: Number(m[1].replace(/,/g, "")) });
      i += m[0].length;
    } else if ("+-*/^()%,×÷".includes(c)) {
      toks.push({ t: "op", v: c === "×" ? "*" : c === "÷" ? "/" : c });
      i++;
    } else if (/[a-z]/i.test(c)) {
      const m = /^[a-z]+/i.exec(src.slice(i))![0].toLowerCase();
      if (!["round", "abs", "min", "max"].includes(m))
        throw new Error(
          `Unknown word "${m}"; only round, abs, min, and max are allowed`,
        );
      toks.push({ t: "fn", v: m });
      i += m.length;
    } else {
      throw new Error(`Unexpected "${c}" at position ${i}`);
    }
  }

  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;
  const expect = (v: string) => {
    if (!isOp(v)) throw new Error(`Expected "${v}"`);
    p++;
  };

  function parseExpr(): number {
    let v = parseTerm();
    while (isOp("+") || isOp("-")) {
      const op = (toks[p++] as { v: string }).v;
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function parseTerm(): number {
    let v = parsePow();
    while (isOp("*") || isOp("/")) {
      const op = (toks[p++] as { v: string }).v;
      const r = parsePow();
      if (op === "/" && r === 0) throw new Error("Division by zero");
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function parsePow(): number {
    const base = parseUnary();
    if (isOp("^")) {
      p++;
      return Math.pow(base, parsePow());
    }
    return base;
  }
  function parseUnary(): number {
    if (isOp("-")) {
      p++;
      return -parseUnary();
    }
    if (isOp("+")) {
      p++;
      return parseUnary();
    }
    return parsePostfix();
  }
  function parsePostfix(): number {
    let v = parseAtom();
    while (isOp("%")) {
      p++;
      v /= 100;
    }
    return v;
  }
  function parseAtom(): number {
    const t = peek();
    if (!t) throw new Error("The expression ends too soon");
    if (t.t === "num") {
      p++;
      return t.v;
    }
    if (t.t === "fn") {
      p++;
      expect("(");
      const args = [parseExpr()];
      while (isOp(",")) {
        p++;
        args.push(parseExpr());
      }
      expect(")");
      switch (t.v) {
        case "round": {
          const places = args[1] ?? 0;
          const f = Math.pow(10, places);
          return Math.round((args[0] + Number.EPSILON) * f) / f;
        }
        case "abs":
          return Math.abs(args[0]);
        case "min":
          return Math.min(...args);
        default:
          return Math.max(...args);
      }
    }
    if (t.t === "op" && t.v === "(") {
      p++;
      const v = parseExpr();
      expect(")");
      return v;
    }
    throw new Error(`Unexpected "${t.v}"`);
  }

  const result = parseExpr();
  if (p !== toks.length)
    throw new Error(`Unexpected "${(toks[p] as { v: string }).v}"`);
  if (!Number.isFinite(result))
    throw new Error("The result isn't a finite number");
  return result;
}

/** "$4,016.00", or "($3,000.00)" for a negative. */
export function formatMoney(n: number): string {
  const s = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `($${s})` : `$${s}`;
}

// --- dates --------------------------------------------------------------------------------

const DAY = 86_400_000;
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Dates are handled as UTC midnight so daylight saving never shifts a day. */
const toTime = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`"${iso}" isn't a date in YYYY-MM-DD form`);
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (new Date(t).toISOString().slice(0, 10) !== iso)
    throw new Error(`"${iso}" isn't a real date`);
  return t;
};
const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);

export const weekdayOf = (iso: string) =>
  WEEKDAYS[new Date(toTime(iso)).getUTCDay()];
export const addDays = (iso: string, days: number) =>
  toIso(toTime(iso) + Math.round(days) * DAY);
export const daysBetween = (from: string, to: string) =>
  Math.round((toTime(to) - toTime(from)) / DAY);

/** "October 31, 2026" */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** The nth (1-based) given weekday of a month, or the last one with n = -1. */
function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  n: number,
): number {
  if (n > 0) {
    const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
    return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  }
  const last = new Date(Date.UTC(year, month + 1, 0));
  return last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7);
}

/** U.S. federal holidays, plus D.C. Emancipation Day (April 16), which the IRS counts. A holiday on a
 *  Saturday is observed the Friday before; on a Sunday, the Monday after. */
export function holidays(year: number): { date: string; name: string }[] {
  const fixed = (m: number, d: number, name: string) => {
    const t = Date.UTC(year, m, d);
    const wd = new Date(t).getUTCDay();
    const observed = wd === 6 ? t - DAY : wd === 0 ? t + DAY : t;
    return {
      date: toIso(observed),
      name: observed === t ? name : `${name} (observed)`,
    };
  };
  const on = (m: number, d: number, name: string) => ({
    date: toIso(Date.UTC(year, m, d)),
    name,
  });
  return [
    fixed(0, 1, "New Year's Day"),
    on(0, nthWeekday(year, 0, 1, 3), "Martin Luther King Jr. Day"),
    on(1, nthWeekday(year, 1, 1, 3), "Presidents' Day"),
    fixed(3, 16, "D.C. Emancipation Day"),
    on(4, nthWeekday(year, 4, 1, -1), "Memorial Day"),
    fixed(5, 19, "Juneteenth"),
    fixed(6, 4, "Independence Day"),
    on(8, nthWeekday(year, 8, 1, 1), "Labor Day"),
    on(9, nthWeekday(year, 9, 1, 2), "Columbus Day"),
    fixed(10, 11, "Veterans Day"),
    on(10, nthWeekday(year, 10, 4, 4), "Thanksgiving"),
    fixed(11, 25, "Christmas Day"),
  ];
}

export function holidayName(iso: string): string | null {
  const y = Number(iso.slice(0, 4));
  // An observed holiday can land in the neighboring year (New Year's Day on a Saturday).
  for (const yr of [y - 1, y, y + 1]) {
    const h = holidays(yr).find((x) => x.date === iso);
    if (h) return h.name;
  }
  return null;
}

export const isWeekend = (iso: string) =>
  ["Saturday", "Sunday"].includes(weekdayOf(iso));

/** The date itself if it is a business day, otherwise the next one (how IRS deadlines roll forward). */
export function nextBusinessDay(iso: string): {
  date: string;
  skipped: string[];
} {
  const skipped: string[] = [];
  let d = iso;
  for (let i = 0; i < 14; i++) {
    const why = isWeekend(d) ? weekdayOf(d) : holidayName(d);
    if (!why) return { date: d, skipped };
    skipped.push(`${longDate(d)} (${why})`);
    d = addDays(d, 1);
  }
  return { date: d, skipped };
}
