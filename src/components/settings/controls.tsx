"use client";

import { useEffect, useId, useRef, useState } from "react";
import { normalizeHex } from "@/lib/color";

// Small building blocks for the settings screen.

/** One setting: a title and description on the left, the control on the right (below on phones). */
export function SettingRow({
  label,
  description,
  htmlFor,
  children,
  labelId,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  labelId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:max-w-[26rem]">
        <label id={labelId} htmlFor={htmlFor} className="block text-sm font-medium">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ui-panel rounded-xl border border-border bg-surface px-5 py-1">
      <header className="pt-4 pb-1">
        <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-[0.8125rem] text-muted">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

export type Option<T extends string | number> = { value: T; label: string; hint?: string };

/** A row of choices where exactly one is selected. Arrow keys move between them. */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="ui-inset ui-pill inline-flex max-w-full flex-wrap gap-0.5 rounded-[0.625rem] bg-hover p-0.5"
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            title={o.hint}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`min-h-9 rounded-lg px-3 text-[0.8125rem] font-medium whitespace-nowrap transition-colors ${
              selected
                ? "bg-surface text-foreground shadow-sm ring-1 ring-border-strong"
                : "text-text-3 hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** An on/off switch. */
export function Switch({
  label,
  checked,
  onChange,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-border-strong"}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

/**
 * A single-line text field. It saves a moment after you stop typing, and when you leave
 * the field, so spaces typed along the way aren't trimmed out from under you.
 */
export function TextField({
  value,
  onCommit,
  placeholder,
  maxLength,
  type = "text",
  autoComplete,
  id,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  maxLength: number;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  id: string;
}) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ draft, value, onCommit });
  useEffect(() => {
    latest.current = { draft, value, onCommit };
  });

  const commit = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const { draft: d, value: v, onCommit: save } = latest.current;
    if (d.trim() !== v) save(d);
  };

  // Save any pending edit if this field goes away (for example, switching tabs).
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        const { draft: d, value: v, onCommit: save } = latest.current;
        if (d.trim() !== v) save(d);
      }
    },
    [],
  );

  return (
    <input
      id={id}
      type={type}
      value={draft}
      maxLength={maxLength}
      placeholder={placeholder}
      autoComplete={autoComplete}
      onChange={(e) => {
        setDraft(e.target.value);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(commit, 600);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      className="ui-inset ui-pill h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-sm outline-none placeholder:text-muted focus:border-accent-text sm:w-72"
    />
  );
}

/** A button that asks twice before doing something that can't be undone. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  danger,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  danger?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <button
      id={id}
      type="button"
      onClick={() => {
        if (confirming) {
          setConfirming(false);
          onConfirm();
        } else {
          setConfirming(true);
        }
      }}
      className={`ui-raised ui-pill h-10 rounded-lg border px-3.5 text-sm font-medium whitespace-nowrap ${
        confirming
          ? "border-transparent bg-error-bg text-error-fg"
          : danger
            ? "border-border-strong text-error-fg hover:bg-error-bg"
            : "border-border-strong text-text-2 hover:bg-hover"
      }`}
    >
      {confirming ? confirmLabel : label}
    </button>
  );
}

export function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-raised ui-pill h-10 rounded-lg border border-border-strong px-3.5 text-sm font-medium whitespace-nowrap text-text-2 hover:bg-hover"
    >
      {label}
    </button>
  );
}

/** A set of larger choices shown as cards, where exactly one is selected. Arrow keys move between them. */
export function ChoiceCards<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "grid-cols-1 sm:grid-cols-2",
}: {
  label: string;
  value: T;
  options: readonly { value: T; content: React.ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-2.5 ${className}`}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`ui-raised ui-soft rounded-xl border p-3.5 text-left transition-colors ${
              selected
                ? "border-accent-text bg-accent-soft ring-1 ring-accent-text"
                : "border-border bg-surface hover:border-border-strong hover:bg-hover"
            }`}
          >
            {o.content}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A color: the browser's own color picker (a wheel or spectrum) plus a hex box.
 * Typing is only applied once it's a complete color, so half-typed values never break anything.
 */
export function ColorField({
  value,
  onChange,
  label,
  id,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  id: string;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  const shown = typed ?? value;
  const valid = typed === null || normalizeHex(typed) !== null;

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={`${label}: pick a color`}
        value={value}
        onChange={(e) => {
          setTyped(null);
          onChange(e.target.value.toLowerCase());
        }}
        className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-border-strong bg-transparent p-0.5"
      />
      <input
        id={id}
        type="text"
        value={shown}
        aria-label={`${label}: hex code`}
        aria-invalid={!valid}
        maxLength={7}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          const next = e.target.value;
          setTyped(next);
          const hex = normalizeHex(next);
          if (hex && next.trim().length >= 4) onChange(hex);
        }}
        onBlur={() => {
          // Leaving the box applies a complete color (such as "abc") and drops half-typed text.
          const hex = typed === null ? null : normalizeHex(typed);
          if (hex) onChange(hex);
          setTyped(null);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const hex = typed === null ? null : normalizeHex(typed);
          if (hex) onChange(hex);
          setTyped(null);
        }}
        className={`h-9 w-24 rounded-lg border bg-background px-2.5 font-mono text-[0.8125rem] outline-none focus:border-accent-text ${
          valid ? "border-border-strong" : "border-error-fg text-error-fg"
        }`}
      />
    </div>
  );
}
