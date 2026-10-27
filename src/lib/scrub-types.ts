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

/** Puts the original values back in place of tokens. Unknown tokens are left as they are. */
export function rehydrate(text: string, vault: VaultEntry[]): string {
  if (vault.length === 0 || !text.includes("[")) return text;
  const lookup = new Map(vault.map((v) => [v.token, v.original]));
  return text.replace(TOKEN, (t) => lookup.get(t) ?? t);
}
