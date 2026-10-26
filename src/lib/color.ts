// Small color helpers for custom themes. Colors are always plain "#rrggbb" strings.

export type RGB = { r: number; g: number; b: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** "#abc", "#aabbcc" (any case, # optional) -> "#aabbcc"; anything else -> null. */
export function normalizeHex(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return `#${h.toLowerCase()}`;
}

export function hexToRgb(hex: string): RGB {
  const h = normalizeHex(hex) ?? "#000000";
  return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const part = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** `amount` of `b` mixed into `a`: 0 gives a, 1 gives b. */
export function mix(a: string, b: string, amount: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const t = clamp(amount, 0, 1);
  return rgbToHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

/** Relative luminance, 0 (black) to 1 (white), as defined by WCAG. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio, 1 (none) to 21 (black on white). Text needs 4.5 or more. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const isDark = (hex: string) => luminance(hex) < 0.18;

/**
 * White or black, whichever reads better on `background`. Pure black (not near-black) is used
 * because one of the two always reaches 4.5 contrast on any color; near-black can fall short.
 */
export function bestTextOn(background: string): string {
  return contrast("#ffffff", background) >= contrast("#000000", background) ? "#ffffff" : "#000000";
}

/**
 * `color`, moved toward black (on a light background) or white (on a dark one) just far
 * enough to reach `min` contrast against `background`. Unchanged if it already does.
 */
export function readableOn(color: string, background: string, min = 4.5): string {
  if (contrast(color, background) >= min) return normalizeHex(color) ?? color;
  const target = isDark(background) ? "#ffffff" : "#000000";
  for (let step = 1; step <= 20; step++) {
    const candidate = mix(color, target, step / 20);
    if (contrast(candidate, background) >= min) return candidate;
  }
  return target;
}

/** A hover shade: a little darker on light colors, a little lighter on dark ones. */
export function hoverShade(color: string): string {
  return isDark(color) ? mix(color, "#ffffff", 0.16) : mix(color, "#000000", 0.16);
}
