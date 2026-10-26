// Token usage and estimated cost for AI replies.
//
// Prices are Anthropic's published rates in US dollars per million tokens, last
// checked on 2026-10-06. They are estimates for display. Re-check them against
// Anthropic's pricing page before charging customers from these numbers.

export type TokenUsage = {
  /** Input tokens that were not read from the cache. */
  input: number;
  /** Input tokens read from the cache (cheaper). */
  cacheRead: number;
  /** Input tokens written to the cache (a little dearer than normal input). */
  cacheWrite: number;
  output: number;
};

export type UsageReport = {
  tokens: TokenUsage;
  /** Estimated cost in US dollars. */
  costUsd: number;
  /** False if some model wasn't in the price table, so the highest known rate was used. */
  priceKnown: boolean;
  models: string[];
};

type Rates = { input: number; output: number; cacheRead: number };

const rates = (input: number, output: number, cacheRead = input * 0.1): Rates => ({
  input,
  output,
  cacheRead,
});

// Dollars per million tokens. Cache reads are 10% of the input price unless stated.
const RATES: Record<string, Rates> = {
  "claude-opus-5-5": rates(4, 20, 0.2),
  "claude-opus-5": rates(5, 25),
  "claude-opus-4-8": rates(5, 25),
  "claude-opus-4-7": rates(5, 25),
  "claude-opus-4-6": rates(5, 25),
  "claude-sonnet-5-5": rates(2, 10, 0.2),
  "claude-sonnet-5": rates(2, 10),
  "claude-sonnet-4-6": rates(3, 15),
  "claude-haiku-5-5": rates(0.1, 0.5),
  "claude-haiku-4-5": rates(1, 5),
  "claude-fable-5-1": rates(10, 50),
  "claude-fable-5": rates(10, 50),
};

// Writing to the cache costs 1.25x the input price for the 5-minute cache, 2x for the 1-hour cache.
const CACHE_WRITE_5M = 1.25;
const CACHE_WRITE_1H = 2;

const HIGHEST: Rates = Object.values(RATES).reduce((hi, r) => ({
  input: Math.max(hi.input, r.input),
  output: Math.max(hi.output, r.output),
  cacheRead: Math.max(hi.cacheRead, r.cacheRead),
}));

function ratesFor(model: string): { rates: Rates; known: boolean } {
  if (RATES[model]) return { rates: RATES[model], known: true };
  // Dated versions of a known model, such as "claude-opus-5-5-20261001".
  const prefix = Object.keys(RATES)
    .filter((k) => model.startsWith(`${k}-`))
    .sort((a, b) => b.length - a.length)[0];
  if (prefix) return { rates: RATES[prefix], known: true };
  return { rates: HIGHEST, known: false };
}

/** Dollars per million tokens for a model's input and output, for showing in Settings. */
export function pricePerMillion(model: string): { input: number; output: number; known: boolean } {
  const { rates: r, known } = ratesFor(model);
  return { input: r.input, output: r.output, known };
}

/**
 * About what one typical answer costs: 3,000 tokens in and 2,000 tokens out, which is close
 * to what a notice question used in testing. Only a guide for comparing models.
 */
export function typicalAnswerUsd(model: string): number {
  const { input, output } = pricePerMillion(model);
  return (3000 * input + 2000 * output) / 1e6;
}

export const emptyReport = (): UsageReport => ({
  tokens: { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 },
  costUsd: 0,
  priceKnown: true,
  models: [],
});

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function addReports(a: UsageReport, b: UsageReport): UsageReport {
  return {
    tokens: {
      input: a.tokens.input + b.tokens.input,
      cacheRead: a.tokens.cacheRead + b.tokens.cacheRead,
      cacheWrite: a.tokens.cacheWrite + b.tokens.cacheWrite,
      output: a.tokens.output + b.tokens.output,
    },
    costUsd: round6(a.costUsd + b.costUsd),
    priceKnown: a.priceKnown && b.priceKnown,
    models: [...new Set([...a.models, ...b.models])],
  };
}

// The parts of an API response's usage that we read. Kept loose so this file works
// with any version of the SDK's types.
type UsageEntry = {
  type?: string;
  model?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_creation?: { ephemeral_1h_input_tokens?: number | null } | null;
};

export type MessageLike = {
  model: string;
  usage: UsageEntry & { iterations?: UsageEntry[] | null };
};

/**
 * Tokens and estimated cost of one API response. When the API reports each attempt
 * separately (for example when a safety fallback ran), each attempt is priced at its
 * own model's rate. A declined attempt is billed too.
 */
export function reportFromMessage(message: MessageLike): UsageReport {
  const attempts = (message.usage.iterations ?? []).filter(
    (e) => e.type === "message" || e.type === "fallback_message",
  );
  const entries: UsageEntry[] = attempts.length ? attempts : [message.usage];

  let report = emptyReport();
  for (const e of entries) {
    const model = e.model ?? message.model;
    const { rates: r, known } = ratesFor(model);
    const input = e.input_tokens ?? 0;
    const output = e.output_tokens ?? 0;
    const cacheRead = e.cache_read_input_tokens ?? 0;
    const written = e.cache_creation_input_tokens ?? 0;
    const written1h = Math.min(written, e.cache_creation?.ephemeral_1h_input_tokens ?? 0);
    const written5m = written - written1h;

    const costUsd =
      (input * r.input +
        output * r.output +
        cacheRead * r.cacheRead +
        written5m * r.input * CACHE_WRITE_5M +
        written1h * r.input * CACHE_WRITE_1H) /
      1e6;

    report = addReports(report, {
      tokens: { input, cacheRead, cacheWrite: written, output },
      costUsd: round6(costUsd),
      priceKnown: known,
      models: [model],
    });
  }
  return report;
}

/** "$0.31", or "<$0.01" for tiny amounts. */
export function formatUsd(amount: number): string {
  if (amount > 0 && amount < 0.01) return "<$0.01";
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 950 -> "950", 12,400 -> "12.4K", 1,250,000 -> "1.25M". */
export function formatTokens(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 2 : 1).replace(/\.?0+$/, "")}K`;
  return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
}

export const totalTokens = (t: TokenUsage) => t.input + t.cacheRead + t.cacheWrite + t.output;
