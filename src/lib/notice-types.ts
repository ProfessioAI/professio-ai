import type { UsageReport } from "./usage";

// Notice details pulled from an uploaded document, shown in the case panel.

/** What /api/extract returns: the details, plus what reading the document used. */
export type ExtractResponse = NoticeDetails & { usage?: UsageReport };

export type NoticeDetails = {
  isIrsNotice: boolean;
  /** As printed, e.g. "CP2000" or "Letter 525". */
  code: string | null;
  /** A few words, e.g. "Underreported income". */
  name: string | null;
  taxYear: string | null;
  /** YYYY-MM-DD */
  noticeDate: string | null;
  /** YYYY-MM-DD, only when printed on the notice. */
  respondBy: string | null;
  /** Total amount due or proposed, in dollars. */
  amount: number | null;
  /** What the amount is, e.g. "Proposed" or "Balance due". */
  amountLabel: string | null;
  /** Set when the amount was hidden from the AI; the browser turns it back into a number. */
  amountToken?: string | null;
};
