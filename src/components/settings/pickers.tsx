"use client";

import { MODELS, type ModelId } from "@/lib/models";
import { ACCENTS, type Accent, type FontChoice, type StyleChoice } from "@/lib/settings";
import { formatUsd, pricePerMillion, typicalAnswerUsd } from "@/lib/usage";
import { ChoiceCards, ColorField } from "./controls";

// ---------------------------------------------------------------------------
// Style: Classic or Glass

function StyleThumb({ style }: { style: StyleChoice }) {
  const glass = style === "glass";
  return (
    <div
      aria-hidden="true"
      className="mb-2.5 flex h-16 items-stretch gap-1.5 overflow-hidden rounded-lg p-1.5"
      style={{
        background: glass
          ? "radial-gradient(60px 40px at 90% 110%, rgba(201,184,240,.8), transparent 70%), radial-gradient(60px 40px at 10% 110%, rgba(244,196,206,.7), transparent 70%), #e8ebf0"
          : "#f5f6f8",
      }}
    >
      <div
        className="w-1/4"
        style={{
          background: glass ? "rgba(255,255,255,.6)" : "#ffffff",
          borderRadius: glass ? 10 : 4,
          border: glass ? "1px solid rgba(255,255,255,.9)" : "1px solid #e4e7ec",
        }}
      />
      <div className="flex flex-1 flex-col justify-between gap-1">
        <div
          style={{
            height: 14,
            width: "55%",
            marginLeft: "auto",
            background: glass ? "#ffffff" : "#0f172a",
            borderRadius: glass ? 8 : 5,
            boxShadow: glass ? "2px 2px 5px rgba(163,173,190,.5)" : "none",
          }}
        />
        <div
          style={{
            height: 20,
            background: glass ? "rgba(255,255,255,.6)" : "#ffffff",
            border: glass ? "1px solid rgba(255,255,255,.9)" : "1px solid #e4e7ec",
            borderRadius: glass ? 10 : 5,
          }}
        />
        <div
          style={{
            height: 9,
            width: "45%",
            background: glass ? "#1e2330" : "#0b6b5c",
            borderRadius: glass ? 99 : 3,
          }}
        />
      </div>
    </div>
  );
}

const STYLE_TEXT: Record<StyleChoice, { name: string; blurb: string }> = {
  classic: { name: "Classic", blurb: "Clean, flat panels and sharp edges. Easy to scan." },
  glass: { name: "Glass", blurb: "Frosted, rounded panels over a soft gradient, with pill buttons." },
};

export function StylePicker({ value, onChange }: { value: StyleChoice; onChange: (v: StyleChoice) => void }) {
  return (
    <ChoiceCards
      label="Style"
      value={value}
      onChange={onChange}
      options={(["classic", "glass"] as const).map((s) => ({
        value: s,
        content: (
          <>
            <StyleThumb style={s} />
            <div className="text-sm font-semibold">{STYLE_TEXT[s].name}</div>
            <div className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{STYLE_TEXT[s].blurb}</div>
          </>
        ),
      }))}
    />
  );
}

// ---------------------------------------------------------------------------
// Accent color: presets, "auto", and a custom color wheel

const SWATCH: Record<Exclude<Accent, "custom" | "auto">, { label: string; color: string }> = {
  teal: { label: "Teal", color: "#0b6b5c" },
  blue: { label: "Blue", color: "#1d4ed8" },
  indigo: { label: "Indigo", color: "#4338ca" },
  rose: { label: "Rose", color: "#be123c" },
  graphite: { label: "Graphite", color: "#1f2937" },
};

const WHEEL =
  "conic-gradient(from 0deg, #ff3b30, #ff9500, #ffcc00, #34c759, #00c7be, #007aff, #af52de, #ff2d55, #ff3b30)";

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,.6))" }}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function AccentPicker({
  value,
  customHex,
  onChange,
  onCustom,
}: {
  value: Accent;
  customHex: string;
  onChange: (a: Exclude<Accent, "custom">) => void;
  onCustom: (hex: string) => void;
}) {
  const ring = (selected: boolean) =>
    `relative flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-surface ${
      selected ? "ring-2 ring-foreground" : "ring-1 ring-border-strong hover:ring-foreground/40"
    }`;
  return (
    <div className="flex flex-col items-start gap-2.5 sm:items-end">
      <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={value === "auto"}
          aria-label="Auto (matches the style)"
          title="Auto: teal for Classic, blue for Glass"
          onClick={() => onChange("auto")}
          className={ring(value === "auto")}
          style={{ background: "linear-gradient(135deg, #0b6b5c 50%, #3b5bdb 50%)" }}
        >
          {value === "auto" ? <Check /> : null}
        </button>
        {ACCENTS.filter((a): a is keyof typeof SWATCH => a !== "auto" && a !== "custom").map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={value === a}
            aria-label={SWATCH[a].label}
            title={SWATCH[a].label}
            onClick={() => onChange(a)}
            className={ring(value === a)}
            style={{ backgroundColor: SWATCH[a].color }}
          >
            {value === a ? <Check /> : null}
          </button>
        ))}
        {/* The custom swatch is a color wheel. The real color input sits invisibly on top of it. */}
        <span className={ring(value === "custom")} style={{ background: WHEEL }} title="Custom color">
          <input
            type="color"
            aria-label="Custom accent color"
            value={customHex}
            onInput={(e) => onCustom((e.target as HTMLInputElement).value.toLowerCase())}
            onChange={(e) => onCustom(e.target.value.toLowerCase())}
            className="absolute inset-0 size-full cursor-pointer rounded-full opacity-0"
          />
          {value === "custom" ? (
            <span
              aria-hidden="true"
              className="pointer-events-none size-5 rounded-full border-2 border-white"
              style={{ backgroundColor: customHex }}
            />
          ) : null}
        </span>
      </div>
      {value === "custom" ? (
        <ColorField id="custom-accent" label="Custom accent" value={customHex} onChange={onCustom} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fonts, each shown in its own typeface

const FONT_STACKS: Record<FontChoice, { name: string; note: string; family: string }> = {
  auto: { name: "Match style", note: "Inter in Classic, Manrope in Glass", family: "var(--auto-font)" },
  inter: { name: "Inter", note: "Neutral and clear", family: "var(--font-inter), system-ui, sans-serif" },
  manrope: {
    name: "Manrope",
    note: "Rounded and modern",
    family: "var(--font-manrope), system-ui, sans-serif",
  },
  system: {
    name: "System",
    note: "Your computer's own font",
    family: 'ui-sans-serif, -apple-system, system-ui, "Segoe UI", Roboto, sans-serif',
  },
  serif: {
    name: "Serif",
    note: "Traditional, like a printed letter",
    family: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  },
  readable: {
    name: "Readable",
    note: "Atkinson Hyperlegible, made for easy reading",
    family: "var(--font-readable), system-ui, sans-serif",
  },
  mono: {
    name: "Mono",
    note: "Fixed width, like a ledger",
    family: "var(--font-plex-mono), ui-monospace, monospace",
  },
};

export const FONT_CHOICES = Object.keys(FONT_STACKS) as FontChoice[];

export function FontPicker({ value, onChange }: { value: FontChoice; onChange: (f: FontChoice) => void }) {
  return (
    <ChoiceCards
      label="Font"
      value={value}
      onChange={onChange}
      className="grid-cols-2 lg:grid-cols-3"
      options={FONT_CHOICES.map((f) => ({
        value: f,
        content: (
          <div style={{ fontFamily: FONT_STACKS[f].family }}>
            <div className="text-2xl leading-none font-semibold">Aa</div>
            <div className="mt-2 text-sm font-semibold">{FONT_STACKS[f].name}</div>
            <div className="mt-0.5 text-xs leading-snug text-muted">{FONT_STACKS[f].note}</div>
            <div className="mt-1.5 truncate text-[0.8125rem] text-text-3">Respond by Oct 31, 2026</div>
          </div>
        ),
      }))}
    />
  );
}

// ---------------------------------------------------------------------------
// LLM model

export function ModelPicker({ value, onChange }: { value: ModelId; onChange: (m: ModelId) => void }) {
  return (
    <ChoiceCards
      label="LLM model"
      value={value}
      onChange={onChange}
      className="grid-cols-1"
      options={MODELS.map((m) => {
        const p = pricePerMillion(m.id);
        const typical = typicalAnswerUsd(m.id);
        return {
          value: m.id,
          content: (
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  value === m.id ? "border-accent-text" : "border-border-strong"
                }`}
              >
                {value === m.id ? <span className="size-2 rounded-full bg-accent-text" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{m.name}</span>
                  {m.recommended ? (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-accent-text">
                      Recommended
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{m.tagline}</span>
                <span className="mt-1.5 block text-xs text-text-3 tabular-nums">
                  ${p.input} in · ${p.output} out per million tokens · about{" "}
                  {typical < 0.01 ? "under 1¢" : formatUsd(typical)} per typical answer
                </span>
              </span>
            </div>
          ),
        };
      })}
    />
  );
}
