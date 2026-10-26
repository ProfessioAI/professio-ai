import type { NoticeDetails } from "@/lib/notice-types";
import type { DateFormat } from "@/lib/settings";

export type DetailsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: NoticeDetails }
  | { status: "error"; message: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-10-31" -> local midnight Date (avoids time-zone shifts). */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * "2026-10-31" shown the way the user chose in settings:
 * us "Oct 31, 2026", numeric "10/31/2026", eu "31 Oct 2026", iso "2026-10-31".
 * Without the year: "Oct 31", "10/31", "31 Oct", "10-31".
 */
export function formatDate(iso: string, withYear = true, style: DateFormat = "us"): string {
  const d = parseLocalDate(iso);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const monthNum = String(d.getMonth() + 1);
  const monthNum2 = String(d.getMonth() + 1).padStart(2, "0");
  const day = d.getDate();
  const day2 = String(day).padStart(2, "0");
  const year = d.getFullYear();
  switch (style) {
    case "numeric":
      return withYear ? `${monthNum}/${day}/${year}` : `${monthNum}/${day}`;
    case "eu":
      return withYear ? `${day} ${month} ${year}` : `${day} ${month}`;
    case "iso":
      return withYear ? `${year}-${monthNum2}-${day2}` : `${monthNum2}-${day2}`;
    default:
      return withYear ? `${month} ${day}, ${year}` : `${month} ${day}`;
  }
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export type Countdown = {
  daysLeft: number;
  /** Days from notice date to deadline, when both are known. */
  totalDays: number | null;
  /** 0..1 share of the response window already used. */
  usedFraction: number | null;
  label: string;
  tone: "ok" | "warn" | "danger";
};

/** `warnDays`: how many days out a deadline turns amber (the "Deadline warning" setting). */
export function countdown(respondBy: string, noticeDate: string | null, warnDays = 7): Countdown {
  const due = parseLocalDate(respondBy);
  const daysLeft = Math.round((due.getTime() - today().getTime()) / DAY_MS);
  const totalDays = noticeDate
    ? Math.max(1, Math.round((due.getTime() - parseLocalDate(noticeDate).getTime()) / DAY_MS))
    : null;
  const usedFraction =
    totalDays !== null ? Math.min(1, Math.max(0, (totalDays - daysLeft) / totalDays)) : null;

  let label: string;
  if (daysLeft > 1) label = `${daysLeft} days left`;
  else if (daysLeft === 1) label = "1 day left";
  else if (daysLeft === 0) label = "Due today";
  else label = `${-daysLeft} day${daysLeft === -1 ? "" : "s"} overdue`;

  const tone = daysLeft <= 0 ? "danger" : daysLeft <= warnDays ? "warn" : "ok";
  return { daysLeft, totalDays, usedFraction, label, tone };
}
