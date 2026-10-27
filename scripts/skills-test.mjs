// Tests the exact math and date logic behind the calculate and check_dates skills.
// Usage: npm run skills:test     (free: no AI, no network)

import assert from "node:assert/strict";
import {
  addDays,
  daysBetween,
  evaluate,
  formatMoney,
  holidayName,
  holidays,
  longDate,
  nextBusinessDay,
  weekdayOf,
} from "../src/lib/skills-math.ts";

let n = 0;
const test = (name, fn) => {
  try {
    fn();
    n++;
  } catch (e) {
    console.error(`FAIL ${name}: ${e.message}`);
    process.exitCode = 1;
  }
};
const vault = { "[AMOUNT_1]": 3170, "[AMOUNT_2]": 4016.5 };
const ev = (s) => evaluate(s, (t) => vault[t] ?? null);

// calculator
test("plain math", () => assert.equal(ev("2 + 3 * 4"), 14));
test("parentheses and power", () => assert.equal(ev("(2 + 3) * 4 ^ 2"), 80));
test("percent", () => assert.equal(ev("200 * 25%"), 50));
test("tokens", () => assert.equal(ev("[AMOUNT_1] * 20%"), 634));
test("tokens and dollars", () =>
  assert.equal(ev("[AMOUNT_2] - $1,000.50"), 3016));
test("rounding", () => assert.equal(ev("round(10 / 3, 2)"), 3.33));
test("negative", () => assert.equal(ev("-5 + 2"), -3));
test("min max abs", () => assert.equal(ev("max(1, abs(-7), min(3, 9))"), 7));
test("unknown token fails", () =>
  assert.throws(() => ev("[AMOUNT_9] + 1"), /Don't know/));
test("code is refused", () =>
  assert.throws(() => ev("process.exit(1)"), /Unknown word/));
test("division by zero", () =>
  assert.throws(() => ev("1 / 0"), /Division by zero/));
test("half-finished expression", () =>
  assert.throws(() => ev("2 +"), /too soon/));
test("money format", () => {
  assert.equal(formatMoney(4016), "$4,016.00");
  assert.equal(formatMoney(-3000), "($3,000.00)");
});

// dates
test("weekday", () => assert.equal(weekdayOf("2026-10-31"), "Saturday"));
test("add days", () => assert.equal(addDays("2026-10-01", 30), "2026-10-31"));
test("add days over a month end", () =>
  assert.equal(addDays("2026-01-31", 1), "2026-02-01"));
test("days between", () =>
  assert.equal(daysBetween("2026-10-01", "2026-10-31"), 30));
test("days between is negative backwards", () =>
  assert.equal(daysBetween("2026-10-31", "2026-10-01"), -30));
test("long date", () =>
  assert.equal(longDate("2026-10-31"), "October 31, 2026"));
test("a fake date is refused", () =>
  assert.throws(() => weekdayOf("2026-02-30"), /real date/));
test("Saturday deadline rolls to Monday", () => {
  const r = nextBusinessDay("2026-10-31");
  assert.equal(r.date, "2026-11-02");
  assert.equal(r.skipped.length, 2);
});
test("business day stays put", () =>
  assert.equal(nextBusinessDay("2026-10-30").date, "2026-10-30"));
test("Thanksgiving 2026", () =>
  assert.equal(holidayName("2026-11-26"), "Thanksgiving"));
test("Christmas on a Friday 2026", () =>
  assert.equal(holidayName("2026-12-25"), "Christmas Day"));
test("July 4 2026 is a Saturday, observed Friday", () => {
  assert.match(holidayName("2026-07-03"), /Independence Day \(observed\)/);
  assert.equal(holidayName("2026-07-04"), null);
});
test("Veterans Day 2026 is a Wednesday", () => {
  assert.equal(weekdayOf("2026-11-11"), "Wednesday");
  assert.equal(holidayName("2026-11-11"), "Veterans Day");
});
test("deadline on Veterans Day rolls to the next day", () =>
  assert.equal(nextBusinessDay("2026-11-11").date, "2026-11-12"));
test("Columbus Day 2026", () =>
  assert.equal(holidayName("2026-10-12"), "Columbus Day"));
test("twelve holidays a year", () => assert.equal(holidays(2027).length, 12));
test("Emancipation Day 2025 is a Wednesday", () =>
  assert.equal(holidayName("2025-04-16"), "D.C. Emancipation Day"));
test("New Year's 2028 falls on a Saturday, observed in 2027", () =>
  assert.match(holidayName("2027-12-31"), /New Year's Day \(observed\)/));

console.log(
  process.exitCode ? "\nSome tests failed." : `OK: ${n} tests passed.`,
);
