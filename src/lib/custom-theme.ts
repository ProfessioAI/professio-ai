// Custom themes: ten colors you choose for light mode and ten for dark mode.
// Every other color in the app (hover shades, borders, soft backgrounds, text on buttons)
// is worked out from them, so a custom theme stays readable whatever you pick.

import {
  bestTextOn,
  contrast,
  hoverShade,
  mix,
  normalizeHex,
  readableOn,
} from "./color";

export const THEME_KEYS = [
  "background",
  "surface",
  "text",
  "mutedText",
  "border",
  "accent",
  "userBubble",
  "userBubbleText",
  "warning",
  "danger",
] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];
export type ThemeColors = Record<ThemeKey, string>;
export type CustomTheme = {
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
};

export const THEME_LABELS: Record<ThemeKey, { label: string; hint: string }> = {
  background: { label: "Page background", hint: "Behind everything" },
  surface: { label: "Panels", hint: "Sidebar, cards, the message box" },
  text: { label: "Text", hint: "Main text" },
  mutedText: { label: "Secondary text", hint: "Descriptions and captions" },
  border: { label: "Borders", hint: "Lines and outlines" },
  accent: { label: "Accent", hint: "Buttons, links, highlights" },
  userBubble: { label: "Your messages", hint: "Background of your messages" },
  userBubbleText: {
    label: "Your messages: text",
    hint: "Text in your messages",
  },
  warning: { label: "Warning", hint: "Deadlines and caution notes" },
  danger: { label: "Danger", hint: "Errors and overdue deadlines" },
};

export type BaseStyle = "classic" | "glass";

/** The colors of the built-in styles, as plain opaque values to start a custom theme from. */
export const BASE_THEMES: Record<BaseStyle, CustomTheme> = {
  classic: {
    name: "Classic",
    light: {
      background: "#f5f6f8",
      surface: "#ffffff",
      text: "#0f172a",
      mutedText: "#667085",
      border: "#e4e7ec",
      accent: "#0b6b5c",
      userBubble: "#0f172a",
      userBubbleText: "#f8fafc",
      warning: "#d97706",
      danger: "#d92d20",
    },
    dark: {
      background: "#0f1115",
      surface: "#171a21",
      text: "#e6e8ee",
      mutedText: "#8f98a8",
      border: "#272c36",
      accent: "#0e7c6b",
      userBubble: "#e6e8ee",
      userBubbleText: "#12151c",
      warning: "#e5a04a",
      danger: "#f97066",
    },
  },
  glass: {
    name: "Glass",
    light: {
      background: "#e8ebf0",
      surface: "#f2f4f8",
      text: "#1e2330",
      mutedText: "#545c6b",
      border: "#d5dae3",
      accent: "#3b5bdb",
      userBubble: "#ffffff",
      userBubbleText: "#1e2330",
      warning: "#d97706",
      danger: "#d92d20",
    },
    dark: {
      background: "#15171c",
      surface: "#1c1f25",
      text: "#eceef2",
      mutedText: "#8c93a1",
      border: "#2a2e37",
      accent: "#4263eb",
      userBubble: "#262a33",
      userBubbleText: "#f4f5f8",
      warning: "#e5a04a",
      danger: "#f97066",
    },
  },
};

export const cloneTheme = (t: CustomTheme): CustomTheme => ({
  name: t.name,
  light: { ...t.light },
  dark: { ...t.dark },
});

/** All the CSS variables for one mode, worked out from the ten chosen colors. */
export function deriveMode(c: ThemeColors): Record<string, string> {
  const { background: bg, surface: s, text: t, mutedText: m } = c;
  const accentHover = hoverShade(c.accent);
  const warnBg = mix(s, c.warning, 0.1);
  const warnStrong = readableOn(c.warning, warnBg, 4.5);
  const errorBg = mix(s, c.danger, 0.12);
  return {
    "--background": bg,
    "--surface": s,
    "--surface-2": mix(s, t, 0.03),
    "--foreground": t,
    "--text-2": mix(t, m, 0.35),
    "--text-3": mix(t, m, 0.7),
    "--muted": m,
    "--border": c.border,
    "--border-strong": mix(c.border, t, 0.18),
    "--border-row": mix(c.border, s, 0.5),
    "--dashed-border": mix(c.border, t, 0.3),
    "--hover": mix(s, t, 0.06),
    "--icon-bg": mix(s, t, 0.08),
    "--raised-bg": mix(s, t, 0.02),
    "--inset-bg": mix(bg, t, 0.05),
    "--accent": c.accent,
    "--accent-hover": accentHover,
    "--accent-text": readableOn(c.accent, s, 4.5),
    "--accent-soft": mix(s, c.accent, 0.13),
    "--accent-fg": bestTextOn(c.accent),
    "--user-bubble": c.userBubble,
    "--user-bubble-fg": c.userBubbleText,
    "--warn-bg": warnBg,
    "--warn-border": mix(s, c.warning, 0.35),
    "--warn-fg": readableOn(mix(c.warning, t, 0.35), warnBg, 4.5),
    "--warn-strong": warnStrong,
    "--pill-bg": warnBg,
    "--pill-fg": warnStrong,
    "--error-bg": errorBg,
    "--error-fg": readableOn(c.danger, errorBg, 4.5),
    "--bar-warn": c.warning,
    "--bar-danger": c.danger,
  };
}

/** Light and dark values, as one CSS value that follows the page's color scheme. */
function pair(light: string, dark: string): string {
  return `light-dark(${light}, ${dark})`;
}

/** The CSS variables that apply a full custom theme. */
export function themeVars(theme: CustomTheme): Record<string, string> {
  const light = deriveMode(theme.light);
  const dark = deriveMode(theme.dark);
  const vars: Record<string, string> = {};
  for (const key of Object.keys(light)) vars[key] = pair(light[key], dark[key]);
  // Primary buttons follow the accent in a custom theme.
  vars["--primary"] = "var(--accent)";
  vars["--primary-hover"] = "var(--accent-hover)";
  vars["--primary-fg"] = "var(--accent-fg)";
  return vars;
}

/** The accent-only variables, for a custom accent over the built-in style. */
export function accentOnlyVars(
  hex: string,
  style: BaseStyle,
): Record<string, string> {
  const base = BASE_THEMES[style];
  const make = (surface: string) => ({
    "--accent": hex,
    "--accent-hover": hoverShade(hex),
    "--accent-text": readableOn(hex, surface, 4.5),
    "--accent-soft": mix(surface, hex, 0.13),
    "--accent-fg": bestTextOn(hex),
  });
  const light = make(base.light.surface);
  const dark = make(base.dark.surface);
  const vars: Record<string, string> = {};
  for (const key of Object.keys(light) as (keyof typeof light)[])
    vars[key] = pair(light[key], dark[key]);
  vars["--primary"] = "var(--accent)";
  vars["--primary-hover"] = "var(--accent-hover)";
  vars["--primary-fg"] = "var(--accent-fg)";
  return vars;
}

// ---------------------------------------------------------------------------
// JSON: the format used to save, share, and load a theme.

export const THEME_FORMAT = "professioai-theme";

export function themeToJson(theme: CustomTheme): string {
  const { name, light, dark } = theme;
  return (
    JSON.stringify(
      { format: THEME_FORMAT, version: 1, name, light, dark },
      null,
      2,
    ) + "\n"
  );
}

export type ParseResult =
  | { ok: true; theme: CustomTheme; filled: string[] }
  | { ok: false; error: string };

/**
 * Reads a theme from JSON text. Colors must be hex (#rgb or #rrggbb). A mode or a color that
 * is missing is filled in from `fallback`, and listed in `filled`. Anything that isn't a
 * valid color is rejected with a message saying where.
 */
export function parseThemeJson(
  text: string,
  fallback: CustomTheme,
): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error:
        "That isn't valid JSON. Check for a missing comma, quote, or bracket.",
    };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      ok: false,
      error: 'A theme is a JSON object with a "light" and a "dark" section.',
    };
  }
  const obj = data as Record<string, unknown>;
  if (obj.format !== undefined && obj.format !== THEME_FORMAT) {
    return {
      ok: false,
      error: `This doesn't look like a ProfessioAI theme (format should be "${THEME_FORMAT}").`,
    };
  }
  if (obj.light === undefined && obj.dark === undefined) {
    return {
      ok: false,
      error: 'The theme needs a "light" section, a "dark" section, or both.',
    };
  }

  const filled: string[] = [];
  const modes = {} as { light: ThemeColors; dark: ThemeColors };
  for (const mode of ["light", "dark"] as const) {
    const section = obj[mode];
    if (section === undefined) {
      modes[mode] = { ...fallback[mode] };
      filled.push(`${mode}: all colors`);
      continue;
    }
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      return {
        ok: false,
        error: `"${mode}" should be an object of colors, like { "accent": "#0b6b5c" }.`,
      };
    }
    const colors = {} as ThemeColors;
    const given = section as Record<string, unknown>;
    for (const key of Object.keys(given)) {
      if (!(THEME_KEYS as readonly string[]).includes(key)) {
        return {
          ok: false,
          error: `${mode}.${key} isn't a color this theme uses. Allowed: ${THEME_KEYS.join(", ")}.`,
        };
      }
    }
    for (const key of THEME_KEYS) {
      if (given[key] === undefined) {
        colors[key] = fallback[mode][key];
        filled.push(`${mode}.${key}`);
        continue;
      }
      const hex = normalizeHex(given[key]);
      if (!hex) {
        return {
          ok: false,
          error: `${mode}.${key} is ${JSON.stringify(given[key])}, which isn't a color. Use a hex color like "#1d4ed8".`,
        };
      }
      colors[key] = hex;
    }
    modes[mode] = colors;
  }

  const name =
    typeof obj.name === "string"
      ? obj.name
          .replace(/[\u0000-\u001f\u007f]/g, " ")
          .trim()
          .slice(0, 40)
      : "";
  return {
    ok: true,
    theme: { name: name || "My theme", light: modes.light, dark: modes.dark },
    filled,
  };
}

/** Checks a stored theme (from the browser's storage), repairing anything wrong from `fallback`. */
export function sanitizeTheme(
  raw: unknown,
  fallback: CustomTheme,
): CustomTheme {
  if (!raw || typeof raw !== "object") return cloneTheme(fallback);
  const r = raw as Record<string, unknown>;
  const mode = (value: unknown, base: ThemeColors): ThemeColors => {
    const v = (value && typeof value === "object" ? value : {}) as Record<
      string,
      unknown
    >;
    const out = {} as ThemeColors;
    for (const key of THEME_KEYS) out[key] = normalizeHex(v[key]) ?? base[key];
    return out;
  };
  const name =
    typeof r.name === "string"
      ? r.name
          .replace(/[\u0000-\u001f\u007f]/g, " ")
          .trim()
          .slice(0, 40)
      : "";
  return {
    name: name || fallback.name,
    light: mode(r.light, fallback.light),
    dark: mode(r.dark, fallback.dark),
  };
}

/** Only plain hex colors and light-dark() pairs of them may be applied as page variables. */
export const SAFE_VALUE =
  /^(#[0-9a-f]{6}|light-dark\(#[0-9a-f]{6}, #[0-9a-f]{6}\)|var\(--accent(-fg|-hover)?\))$/;
export const SAFE_NAME = /^--[a-z0-9-]{1,32}$/;

export function sanitizeVars(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (SAFE_NAME.test(k) && typeof v === "string" && SAFE_VALUE.test(v))
      out[k] = v;
  }
  return out;
}

/**
 * Plain-language warnings about colors that will be hard to read. Derived colors fix
 * themselves, but text on the page, text on panels, and your own messages are your choice.
 */
export function themeWarnings(theme: CustomTheme): string[] {
  const out: string[] = [];
  for (const mode of ["light", "dark"] as const) {
    const c = theme[mode];
    const label = mode === "light" ? "Light" : "Dark";
    if (contrast(c.text, c.background) < 4.5)
      out.push(
        `${label} mode: the text is hard to read on the page background.`,
      );
    if (contrast(c.text, c.surface) < 4.5)
      out.push(`${label} mode: the text is hard to read on panels.`);
    if (contrast(c.mutedText, c.surface) < 3)
      out.push(`${label} mode: secondary text is very faint on panels.`);
    if (contrast(c.userBubbleText, c.userBubble) < 4.5)
      out.push(`${label} mode: the text in your messages is hard to read.`);
    if (contrast(c.accent, c.surface) < 1.5)
      out.push(
        `${label} mode: the accent is almost the same color as the panels.`,
      );
  }
  return out;
}
