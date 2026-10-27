import { amountToNumber, dateToIso, type VaultEntry } from "../scrub-types";

/**
 * What a tool may use while it runs. The vault says what hidden values (tokens like [AMOUNT_1])
 * stand for. Tools work with the real values here, on this computer, and hand back only tokens,
 * so a hidden amount or date never reaches the AI. New tokens are collected in `added` and sent
 * to the browser, which keeps the vault.
 */
export type ToolContext = {
  /** The real value behind a token, as written, or null if it isn't in the vault. */
  original: (token: string) => string | null;
  amount: (token: string) => number | null;
  date: (token: string) => string | null;
  /** Registers a new hidden value and returns its token. */
  hide: (type: "AMOUNT" | "DATE", original: string) => string;
  added: VaultEntry[];
};

const TOKEN = /^\[([A-Z]+)_(\d+)\]$/;

export function createToolContext(vault: VaultEntry[]): ToolContext {
  const added: VaultEntry[] = [];
  const all = () => [...vault, ...added];
  const original = (token: string) =>
    all().find((v) => v.token === token)?.original ?? null;
  return {
    original,
    amount: (token) => {
      const o = original(token);
      return o === null ? null : amountToNumber(o);
    },
    date: (token) => {
      const o = original(token);
      return o === null ? null : dateToIso(o);
    },
    hide: (type, text) => {
      const existing = all().find(
        (v) => v.type === type && v.original === text,
      );
      if (existing) return existing.token;
      const max = all()
        .map((v) => TOKEN.exec(v.token))
        .filter((m): m is RegExpExecArray => m !== null && m[1] === type)
        .reduce((n, m) => Math.max(n, Number(m[2])), 0);
      const token = `[${type}_${max + 1}]`;
      added.push({ token, type, original: text });
      return token;
    },
    added,
  };
}
