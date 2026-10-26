"use client";

import { useId, useRef, useState } from "react";
import {
  BASE_THEMES,
  THEME_KEYS,
  THEME_LABELS,
  cloneTheme,
  parseThemeJson,
  themeToJson,
  themeWarnings,
  type CustomTheme,
  type ThemeKey,
} from "@/lib/custom-theme";
import type { Settings } from "@/lib/settings";
import { ActionButton, Card, ColorField, ConfirmButton, SettingRow, Switch, TextField } from "./controls";

type Patch = (p: Partial<Settings>) => void;

/** Save and load a theme as JSON: copy, download, upload, or edit the text and apply it. */
function ThemeJson({
  theme,
  fallback,
  onApply,
}: {
  theme: CustomTheme;
  fallback: CustomTheme;
  onApply: (t: CustomTheme) => void;
}) {
  const current = themeToJson(theme);
  const [text, setText] = useState(current);
  // When the colors change from somewhere else (a color wheel, the name box), show the new JSON.
  // Any message stays, so "Applied ... filled in from ..." isn't lost when applying changes the colors.
  const [syncedFrom, setSyncedFrom] = useState(current);
  if (current !== syncedFrom) {
    setSyncedFrom(current);
    setText(current);
  }
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();

  function apply(source: string) {
    const result = parseThemeJson(source, fallback);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    onApply(result.theme);
    setText(themeToJson(result.theme));
    setMessage({
      kind: "ok",
      text: result.filled.length
        ? `Applied "${result.theme.name}". Filled in from ${fallback.name}: ${result.filled.join(", ")}.`
        : `Applied "${result.theme.name}".`,
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(current);
      setMessage({ kind: "ok", text: "Copied to the clipboard." });
    } catch {
      setMessage({ kind: "error", text: "Couldn't copy. Select the text and copy it yourself." });
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([current], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${
      (theme.name || "theme")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "theme"
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 100_000) {
      setMessage({ kind: "error", text: "That file is too large to be a theme." });
      return;
    }
    const source = await file.text();
    setText(source);
    apply(source);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <label htmlFor={id} className="block text-sm font-medium">
        Theme as JSON
      </label>
      <p className="mt-0.5 mb-2.5 text-[0.8125rem] leading-snug text-muted">
        Save your colors as text or a file, share them, or paste someone else&apos;s here. Colors are hex
        codes, like #1d4ed8.
      </p>
      <textarea
        id={id}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setMessage(null);
        }}
        rows={8}
        spellCheck={false}
        className="ui-inset w-full rounded-lg border border-border-strong bg-background p-3 font-mono text-xs leading-relaxed outline-none focus:border-accent-text"
      />
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => apply(text)}
          disabled={text === current}
          className="ui-primary h-10 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-40"
        >
          Apply
        </button>
        <ActionButton label="Copy" onClick={copy} />
        <ActionButton label="Download .json" onClick={download} />
        <ActionButton label="Upload .json" onClick={() => fileRef.current?.click()} />
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </div>
      {message ? (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mt-2.5 rounded-lg px-3 py-2 text-[0.8125rem] ${
            message.kind === "error" ? "bg-error-bg text-error-fg" : "bg-accent-soft text-accent-text"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function ModeColors({
  mode,
  theme,
  onChange,
}: {
  mode: "light" | "dark";
  theme: CustomTheme;
  onChange: (mode: "light" | "dark", key: ThemeKey, hex: string) => void;
}) {
  const uid = useId();
  return (
    <div className="min-w-0">
      <h3 className="mb-1 text-sm font-semibold">{mode === "light" ? "Light mode" : "Dark mode"}</h3>
      <ul className="flex flex-col">
        {THEME_KEYS.map((key) => (
          <li
            key={key}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-border py-2.5 last:border-b-0"
          >
            <div className="min-w-0">
              <div className="text-[0.8125rem] font-medium">{THEME_LABELS[key].label}</div>
              <div className="text-xs text-muted">{THEME_LABELS[key].hint}</div>
            </div>
            <ColorField
              id={`${uid}-${mode}-${key}`}
              label={`${mode === "light" ? "Light" : "Dark"} ${THEME_LABELS[key].label}`}
              value={theme[mode][key]}
              onChange={(hex) => onChange(mode, key, hex)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CustomColors({ s, set }: { s: Settings; set: Patch }) {
  const base = BASE_THEMES[s.style];
  const theme = s.customTheme;
  const on = s.useCustomTheme && theme !== null;
  const warnings = on && theme ? themeWarnings(theme) : [];

  function turnOn(enabled: boolean) {
    if (!enabled) return set({ useCustomTheme: false });
    set({ useCustomTheme: true, customTheme: theme ?? cloneTheme(base) });
  }

  function setColor(mode: "light" | "dark", key: ThemeKey, hex: string) {
    if (!theme) return;
    set({ customTheme: { ...theme, [mode]: { ...theme[mode], [key]: hex } } });
  }

  return (
    <Card
      title="Custom colors"
      description="Change every color in the app. Pick them with a color wheel, or load them from JSON."
    >
      <SettingRow
        label="Use my own colors"
        description="Replaces the Classic or Glass colors. Hover shades, borders, and button text are worked out for you so everything stays readable."
      >
        <Switch label="Use my own colors" checked={on} onChange={turnOn} />
      </SettingRow>

      {on && theme ? (
        <>
          <SettingRow label="Theme name">
            <TextField
              id="custom-theme-name"
              value={theme.name}
              maxLength={40}
              placeholder="My theme"
              onCommit={(name) => set({ customTheme: { ...theme, name: name || "My theme" } })}
            />
          </SettingRow>
          <SettingRow label="Start over from" description="Replaces your colors with a built-in set.">
            <div className="flex flex-wrap gap-2">
              <ActionButton
                label="Classic colors"
                onClick={() => set({ customTheme: cloneTheme(BASE_THEMES.classic) })}
              />
              <ActionButton
                label="Glass colors"
                onClick={() => set({ customTheme: cloneTheme(BASE_THEMES.glass) })}
              />
            </div>
          </SettingRow>
          <div className="grid gap-x-8 gap-y-4 border-b border-border py-4 lg:grid-cols-2">
            <ModeColors mode="light" theme={theme} onChange={setColor} />
            <ModeColors mode="dark" theme={theme} onChange={setColor} />
          </div>
          <p className="border-b border-border py-3 text-[0.8125rem] text-muted">
            The mode you see depends on the Theme setting above (System, Light, or Dark).
            {s.style === "glass"
              ? " In Glass, panels use your color as a solid, so the frosted see-through look is lost."
              : ""}
          </p>
          {warnings.length ? (
            <ul
              role="status"
              className="my-3 flex flex-col gap-1 rounded-lg bg-warn-bg px-3.5 py-2.5 text-[0.8125rem] text-warn-fg"
            >
              {warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      <ThemeJson
        theme={theme ?? cloneTheme(base)}
        fallback={base}
        onApply={(t) => set({ customTheme: t, useCustomTheme: true })}
      />

      {on ? (
        <SettingRow
          label="Go back to the built-in colors"
          description="Your custom colors are deleted from this browser."
        >
          <ConfirmButton
            label="Delete custom colors"
            confirmLabel="Press again to delete"
            danger
            onConfirm={() => set({ useCustomTheme: false, customTheme: null })}
          />
        </SettingRow>
      ) : null}
    </Card>
  );
}
