import type { NoticeDetails } from "@/lib/notice-types";

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

export function formatDate(iso: string, withYear = true): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });
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

export function countdown(respondBy: string, noticeDate: string | null): Countdown {
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

  const tone = daysLeft <= 0 ? "danger" : daysLeft <= 7 ? "warn" : "ok";
  return { daysLeft, totalDays, usedFraction, label, tone };
}
