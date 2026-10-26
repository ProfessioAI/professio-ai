// The AI models a user can choose between (Settings > Chat > LLM model).
//
// The server only accepts ids from this list, so the browser can never ask for a model
// that isn't offered here. Prices come from src/lib/usage.ts.

export const MODEL_IDS = [
  "claude-opus-5-5",
  "claude-sonnet-5-5",
  "claude-haiku-5-5",
  "claude-fable-5-1",
] as const;
export type ModelId = (typeof MODEL_IDS)[number];

export const DEFAULT_MODEL: ModelId = "claude-opus-5-5";

export type ModelInfo = {
  id: ModelId;
  name: string;
  /** One line shown under the name in Settings. */
  tagline: string;
  recommended?: boolean;
  /**
   * Whether a request to this model may ask for server-side fallback (a backup model
   * that retries a request the safety checks decline). Haiku 5.5 has no fallback.
   */
  serverFallback: boolean;
};

export const MODELS: readonly ModelInfo[] = [
  {
    id: "claude-opus-5-5",
    name: "Claude Opus 5.5",
    tagline: "Strong reasoning for notices, deadlines, and careful drafting.",
    recommended: true,
    serverFallback: true,
  },
  {
    id: "claude-sonnet-5-5",
    name: "Claude Sonnet 5.5",
    tagline: "Faster and about half the price. A good fit for routine notices.",
    serverFallback: true,
  },
  {
    id: "claude-haiku-5-5",
    name: "Claude Haiku 5.5",
    tagline: "Fastest and lowest cost. Best for simple questions; check its answers more closely.",
    serverFallback: false,
  },
  {
    id: "claude-fable-5-1",
    name: "Claude Fable 5.1",
    tagline: "Anthropic's most capable model, at the highest price. For the hardest cases.",
    serverFallback: true,
  },
];

export function modelInfo(id: string): ModelInfo {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}
