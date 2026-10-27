// The privacy scrubber (services/scrubber) replaces client identifiers with tokens such as
// [SSN_1] before anything is sent to the AI. The vault says what each token stands for, and it
// stays in the browser: it is never sent to the AI.

export type VaultEntry = {
  token: string;
  type: string;
  original: string;
};

export type ReviewItem = {
  type: string;
  text: string;
  reason: string;
};

export type ScrubItemIn =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "pdf"; data: string };

export type ScrubItemOut = {
  id: string;
  /** The text with identifiers replaced. Empty when the item needs review. */
  text: string;
  /** How many identifiers were replaced. */
  replaced: number;
  review: ReviewItem[];
};

export type ScrubResponse = {
  items: ScrubItemOut[];
  /** The vault with any new tokens added. */
  vault: VaultEntry[];
  /** True when something couldn't be scrubbed with confidence. Nothing should be sent on. */
  needsReview: boolean;
};

const TOKEN = /\[[A-Z]+_\d+(?:_[A-Z]+)?\]/g;

/** A written-out, ISO, or numeric date as YYYY-MM-DD, or null if it can't be read. */
export function dateToIso(text: string): string | null {
  const t = text.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(`${t.replace(/(\d)(st|nd|rd|th)\b/, "$1")} 12:00`);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "$4,016.00" or "($3,000)" as a number, or null if it can't be read. */
export function amountToNumber(text: string): number | null {
  const n = Number(text.replace(/[^0-9.]/g, ""));
  if (!text.match(/\d/) || Number.isNaN(n)) return null;
  return /^\s*\(.*\)\s*$|^\s*-/.test(text) ? -n : n;
}

/** Puts the original values back in place of tokens. Unknown tokens are left as they are. */
export function rehydrate(text: string, vault: VaultEntry[]): string {
  if (vault.length === 0 || !text.includes("[")) return text;
  const lookup = new Map(vault.map((v) => [v.token, v.original]));
  return text.replace(TOKEN, (t) => lookup.get(t) ?? t);
}
