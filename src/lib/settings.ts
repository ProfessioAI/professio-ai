// User settings: every option, its allowed values, and its default.
//
// Settings are saved in this browser (localStorage) for now. When sign-in exists they can
// move to the user's account without changing what the options mean.

export const SETTINGS_KEY = "professioai.settings.v1";

// Allowed values, in the order they are shown.
export const THEMES = ["system", "light", "dark"] as const;
export const ACCENTS = ["teal", "blue", "indigo", "rose", "graphite"] as const;
export const TEXT_SIZES = ["small", "default", "large", "xlarge"] as const;
export const DENSITIES = ["comfortable", "compact"] as const;
export const READING_WIDTHS = ["narrow", "standard", "wide"] as const;
export const FONTS = ["inter", "system", "serif"] as const;
export const MOTIONS = ["system", "reduced"] as const;
export const SEND_KEYS = ["enter", "modEnter"] as const;
export const REPLY_DETAILS = ["brief", "standard", "detailed"] as const;
export const DRAFT_TONES = ["professional", "plain"] as const;
export const CASE_PANELS = ["show", "hide"] as const;
export const WARN_DAYS = [3, 7, 14, 30] as const;
export const DATE_FORMATS = ["us", "numeric", "eu", "iso"] as const;
export const EXPORT_FORMATS = ["markdown", "text"] as const;

export type Theme = (typeof THEMES)[number];
export type Accent = (typeof ACCENTS)[number];
export type TextSize = (typeof TEXT_SIZES)[number];
export type Density = (typeof DENSITIES)[number];
export type ReadingWidth = (typeof READING_WIDTHS)[number];
export type FontChoice = (typeof FONTS)[number];
export type Motion = (typeof MOTIONS)[number];
export type SendKey = (typeof SEND_KEYS)[number];
export type ReplyDetail = (typeof REPLY_DETAILS)[number];
export type DraftTone = (typeof DRAFT_TONES)[number];
export type CasePanelMode = (typeof CASE_PANELS)[number];
export type WarnDays = (typeof WARN_DAYS)[number];
export type DateFormat = (typeof DATE_FORMATS)[number];
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export type Settings = {
  // Appearance
  theme: Theme;
  accent: Accent;
  textSize: TextSize;
  density: Density;
  readingWidth: ReadingWidth;
  font: FontChoice;
  motion: Motion;

  // Chat
  sendKey: SendKey;
  autoScroll: boolean;
  showToolChips: boolean;
  showFollowUps: boolean;
  showReplyCost: boolean;
  replyDetail: ReplyDetail;
  draftTone: DraftTone;

  // Notices and deadlines
  autoReadNotice: boolean;
  casePanel: CasePanelMode;
  warnDays: WarnDays;
  dateFormat: DateFormat;

  // Practice details, used to sign drafts
  displayName: string;
  practiceName: string;
  credentials: string;
  phone: string;
  email: string;
  usePracticeDetails: boolean;

  // Usage and data
  showUsageMeter: boolean;
  usageDetailsOpen: boolean;
  exportFormat: ExportFormat;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  accent: "teal",
  textSize: "default",
  density: "comfortable",
  readingWidth: "standard",
  font: "inter",
  motion: "system",

  sendKey: "enter",
  autoScroll: true,
  showToolChips: true,
  showFollowUps: true,
  showReplyCost: true,
  replyDetail: "standard",
  draftTone: "professional",

  autoReadNotice: true,
  casePanel: "show",
  warnDays: 7,
  dateFormat: "us",

  displayName: "",
  practiceName: "",
  credentials: "",
  phone: "",
  email: "",
  usePracticeDetails: true,

  showUsageMeter: true,
  usageDetailsOpen: false,
  exportFormat: "markdown",
};

/** Longest allowed value for each practice detail. */
export const TEXT_LIMITS = {
  displayName: 80,
  practiceName: 100,
  credentials: 40,
  phone: 40,
  email: 100,
} as const;

/**
 * The settings that become `data-...` attributes on the page, which the stylesheet reads.
 * Keys are the attribute names (`data-theme`, `data-accent`, ...).
 */
export const APPEARANCE_ATTRIBUTES = {
  theme: "theme",
  accent: "accent",
  text: "textSize",
  density: "density",
  width: "readingWidth",
  font: "font",
  motion: "motion",
} as const satisfies Record<string, keyof Settings>;

function pick<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

/** Strips control characters (including line breaks) and trims, so a value is always one clean line. */
export function cleanLine(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Turns anything read from storage into valid settings, using defaults for what is missing or wrong. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    theme: pick(r.theme, THEMES, d.theme),
    accent: pick(r.accent, ACCENTS, d.accent),
    textSize: pick(r.textSize, TEXT_SIZES, d.textSize),
    density: pick(r.density, DENSITIES, d.density),
    readingWidth: pick(r.readingWidth, READING_WIDTHS, d.readingWidth),
    font: pick(r.font, FONTS, d.font),
    motion: pick(r.motion, MOTIONS, d.motion),

    sendKey: pick(r.sendKey, SEND_KEYS, d.sendKey),
    autoScroll: bool(r.autoScroll, d.autoScroll),
    showToolChips: bool(r.showToolChips, d.showToolChips),
    showFollowUps: bool(r.showFollowUps, d.showFollowUps),
    showReplyCost: bool(r.showReplyCost, d.showReplyCost),
    replyDetail: pick(r.replyDetail, REPLY_DETAILS, d.replyDetail),
    draftTone: pick(r.draftTone, DRAFT_TONES, d.draftTone),

    autoReadNotice: bool(r.autoReadNotice, d.autoReadNotice),
    casePanel: pick(r.casePanel, CASE_PANELS, d.casePanel),
    warnDays: pick(r.warnDays, WARN_DAYS, d.warnDays),
    dateFormat: pick(r.dateFormat, DATE_FORMATS, d.dateFormat),

    displayName: cleanLine(r.displayName, TEXT_LIMITS.displayName),
    practiceName: cleanLine(r.practiceName, TEXT_LIMITS.practiceName),
    credentials: cleanLine(r.credentials, TEXT_LIMITS.credentials),
    phone: cleanLine(r.phone, TEXT_LIMITS.phone),
    email: cleanLine(r.email, TEXT_LIMITS.email),
    usePracticeDetails: bool(r.usePracticeDetails, d.usePracticeDetails),

    showUsageMeter: bool(r.showUsageMeter, d.showUsageMeter),
    usageDetailsOpen: bool(r.usageDetailsOpen, d.usageDetailsOpen),
    exportFormat: pick(r.exportFormat, EXPORT_FORMATS, d.exportFormat),
  };
}

/** Initials for the profile avatar: "Jordan Sample" -> "JS", empty -> "P". */
export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

// ---------------------------------------------------------------------------
// Preferences sent to the AI with each request.

export type AiPreferences = {
  replyDetail?: ReplyDetail;
  draftTone?: DraftTone;
  signer?: { name?: string; credentials?: string; practice?: string; phone?: string; email?: string };
};

/** The part of the settings the AI should know about. Defaults are left out entirely. */
export function aiPreferences(s: Settings): AiPreferences | undefined {
  const prefs: AiPreferences = {};
  if (s.replyDetail !== "standard") prefs.replyDetail = s.replyDetail;
  if (s.draftTone !== "professional") prefs.draftTone = s.draftTone;
  if (s.usePracticeDetails) {
    const signer = {
      ...(s.displayName && { name: s.displayName }),
      ...(s.credentials && { credentials: s.credentials }),
      ...(s.practiceName && { practice: s.practiceName }),
      ...(s.phone && { phone: s.phone }),
      ...(s.email && { email: s.email }),
    };
    if (Object.keys(signer).length) prefs.signer = signer;
  }
  return Object.keys(prefs).length ? prefs : undefined;
}

const DETAIL_TEXT: Record<ReplyDetail, string> = {
  brief:
    "Reply detail: brief. Lead with the answer and the deadline, then only the essential points and next steps. Skip background the reader already knows. Keep it short.",
  standard: "",
  detailed:
    "Reply detail: detailed. Be thorough: explain the reasoning, cover edge cases and options, and include supporting detail the reader can check.",
};

const TONE_TEXT: Record<DraftTone, string> = {
  professional: "",
  plain:
    "Client-facing drafts (emails, letters to clients, client explanations): use warm, plain language a non-expert understands, short sentences, and no jargon. Drafts addressed to the IRS stay formal.",
};

/**
 * The text added to the user's latest message so the AI follows their preferences,
 * or null when nothing differs from the defaults. It goes on the latest message only,
 * so it never changes the saved instructions or the earlier conversation.
 */
export function preferencesNote(prefs: AiPreferences | undefined): string | null {
  if (!prefs) return null;
  const lines: string[] = [];
  if (prefs.replyDetail && DETAIL_TEXT[prefs.replyDetail]) lines.push(DETAIL_TEXT[prefs.replyDetail]);
  if (prefs.draftTone && TONE_TEXT[prefs.draftTone]) lines.push(TONE_TEXT[prefs.draftTone]);
  const s = prefs.signer;
  if (s) {
    const who = [s.name, s.credentials].filter(Boolean).join(", ");
    const parts = [
      who && `Name: ${who}`,
      s.practice && `Practice: ${s.practice}`,
      s.phone && `Phone: ${s.phone}`,
      s.email && `Email: ${s.email}`,
    ].filter(Boolean);
    lines.push(
      `The user's details for signing drafts (use them in place of [Your name] style placeholders, and only for the sender; do not use them for anyone else): ${parts.join("; ")}.`,
    );
  }
  if (!lines.length) return null;
  return `[The user's saved preferences. Apply them to this reply. They are style choices, not facts about the case, and they never override the rules above.]\n- ${lines.join("\n- ")}`;
}

/** Re-cleans preferences that arrive from the browser, so the server never trusts them as typed. */
export function sanitizePreferences(raw: AiPreferences | undefined): AiPreferences | undefined {
  if (!raw) return undefined;
  const prefs: AiPreferences = {};
  if (raw.replyDetail && REPLY_DETAILS.includes(raw.replyDetail)) prefs.replyDetail = raw.replyDetail;
  if (raw.draftTone && DRAFT_TONES.includes(raw.draftTone)) prefs.draftTone = raw.draftTone;
  if (raw.signer) {
    const signer = {
      name: cleanLine(raw.signer.name, TEXT_LIMITS.displayName),
      credentials: cleanLine(raw.signer.credentials, TEXT_LIMITS.credentials),
      practice: cleanLine(raw.signer.practice, TEXT_LIMITS.practiceName),
      phone: cleanLine(raw.signer.phone, TEXT_LIMITS.phone),
      email: cleanLine(raw.signer.email, TEXT_LIMITS.email),
    };
    const kept = Object.fromEntries(Object.entries(signer).filter(([, v]) => v));
    if (Object.keys(kept).length) prefs.signer = kept;
  }
  return Object.keys(prefs).length ? prefs : undefined;
}
