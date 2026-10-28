"use client";

import { useMemo, useState } from "react";
import { Card, Segmented, Switch } from "@/components/settings/controls";
import { computeReturn } from "@/engine/compute";
import type { ReturnInputRaw } from "@/engine/input";
import type { Line } from "@/engine/ledger";
import type { FilingStatus } from "@/engine/years/2024";

// The tax return screen: fill in the facts and see the 2024 return worked out as you go. The
// numbers come from the rules in src/engine (no AI), and nothing here leaves the browser or is saved.

type Person = { age: string; blind: boolean; ssn: boolean };
type Dep = {
  id: number;
  name: string;
  age: string;
  ssn: boolean;
  child: boolean;
};
type W2Row = { id: number; employer: string; wages: string; withheld: string };
type IntRow = { id: number; payer: string; amount: string; withheld: string };
type DivRow = {
  id: number;
  payer: string;
  ordinary: string;
  qualified: string;
  withheld: string;
};
type UnRow = { id: number; payer: string; amount: string; withheld: string };

type State = {
  fs: FilingStatus;
  primary: Person;
  spouse: Person;
  claimed: boolean;
  deps: Dep[];
  w2s: W2Row[];
  interest: IntRow[];
  dividends: DivRow[];
  unemployment: UnRow[];
  estimated: string;
};

let nextId = 1;
const id = () => nextId++;
const person = (): Person => ({ age: "", blind: false, ssn: true });
const blank = (): State => ({
  fs: "single",
  primary: person(),
  spouse: person(),
  claimed: false,
  deps: [],
  w2s: [],
  interest: [],
  dividends: [],
  unemployment: [],
  estimated: "",
});
const example = (): State => ({
  ...blank(),
  primary: { age: "35", blind: false, ssn: true },
  w2s: [{ id: id(), employer: "Example Co", wages: "50000", withheld: "5000" }],
  interest: [{ id: id(), payer: "Example Bank", amount: "100", withheld: "" }],
});

const money = (s: string) => {
  const n = Number(s.replace(/[,$\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const whole = (s: string) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const usd = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

function toInput(s: State): ReturnInputRaw {
  const toPerson = (p: Person) => ({
    age65OrOlder: (whole(p.age) ?? 0) >= 65,
    blind: p.blind,
    hasValidSsn: p.ssn,
    ...(whole(p.age) !== undefined ? { ageAtYearEnd: whole(p.age) } : {}),
  });
  return {
    filingStatus: s.fs,
    primary: toPerson(s.primary),
    ...(s.fs === "mfj" ? { spouse: toPerson(s.spouse) } : {}),
    canBeClaimedAsDependent: s.claimed,
    dependents: s.deps.map((d) => ({
      name: d.name || undefined,
      ageAtYearEnd: whole(d.age) ?? 0,
      hasValidSsn: d.ssn,
      isQualifyingChild: d.child,
    })),
    w2s: s.w2s.map((w) => ({
      employer: w.employer || undefined,
      wages: money(w.wages),
      federalWithheld: money(w.withheld),
    })),
    interest: s.interest.map((i) => ({
      payer: i.payer || undefined,
      taxableInterest: money(i.amount),
      federalWithheld: money(i.withheld),
    })),
    dividends: s.dividends.map((d) => ({
      payer: d.payer || undefined,
      ordinaryDividends: money(d.ordinary),
      qualifiedDividends: money(d.qualified),
      federalWithheld: money(d.withheld),
    })),
    unemployment: s.unemployment.map((u) => ({
      payer: u.payer || undefined,
      amount: money(u.amount),
      federalWithheld: money(u.withheld),
    })),
    estimatedPayments: money(s.estimated),
  };
}

// --- small form pieces -------------------------------------------------------------------------

const box =
  "ui-inset h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-sm outline-none placeholder:text-muted focus:border-accent-text";

function Text({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
}) {
  return (
    <input
      aria-label={label}
      value={value}
      placeholder={placeholder ?? label}
      onChange={(e) => onChange(e.target.value)}
      className={box}
    />
  );
}

function Money({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted"
      >
        $
      </span>
      <input
        aria-label={label}
        inputMode="decimal"
        value={value}
        placeholder={label}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
        className={`${box} pl-6 tabular-nums`}
      />
    </div>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] text-text-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}

function Remove({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-10 shrink-0 items-center justify-center rounded-lg text-text-3 hover:bg-hover hover:text-foreground"
    >
      ×
    </button>
  );
}

function Add({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-raised ui-pill mt-1 mb-3 h-9 self-start rounded-lg border border-border-strong bg-surface px-3 text-[0.8125rem] font-medium text-text-2 hover:bg-hover"
    >
      + {children}
    </button>
  );
}

function PersonFields({
  p,
  onChange,
  title,
}: {
  p: Person;
  onChange: (p: Person) => void;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
      <span className="w-24 text-sm font-medium">{title}</span>
      <div className="w-36">
        <Text
          label={`${title}: age on December 31`}
          placeholder="Age on Dec 31"
          value={p.age}
          onChange={(v) =>
            onChange({ ...p, age: v.replace(/\D/g, "").slice(0, 3) })
          }
        />
      </div>
      <Check
        label="Blind"
        checked={p.blind}
        onChange={(v) => onChange({ ...p, blind: v })}
      />
      <Check
        label="Has a Social Security number valid for work"
        checked={p.ssn}
        onChange={(v) => onChange({ ...p, ssn: v })}
      />
    </div>
  );
}

// --- results -----------------------------------------------------------------------------------

/** The lines worth showing first, in the order of the form. */
const KEY_LINES = [
  "1040.1z",
  "1040.9",
  "1040.11",
  "1040.12",
  "1040.15",
  "1040.16",
  "1040.19",
  "1040.24",
  "1040.25d",
  "1040.27",
  "1040.28",
  "1040.33",
  "1040.34",
  "1040.37",
];

function LineRow({
  line,
  selected,
  onSelect,
}: {
  line: Line;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`flex w-full items-baseline justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-[0.8125rem] hover:bg-hover ${selected ? "bg-accent-soft" : ""}`}
      >
        <span className="min-w-0">
          <span className="mr-2 text-xs text-muted tabular-nums">
            {line.form === "Form 1040" ? "" : `${line.form} `}line {line.line}
          </span>
          {line.label}
        </span>
        <span className="shrink-0 font-medium tabular-nums">
          {usd(line.amount)}
        </span>
      </button>
    </li>
  );
}

export default function ReturnView({ onBack }: { onBack: () => void }) {
  const [s, setS] = useState<State>(blank);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const set = (patch: Partial<State>) =>
    setS((prev) => ({ ...prev, ...patch }));

  const result = useMemo(() => computeReturn(toInput(s)), [s]);
  const lines = Object.values(result.lines);
  const key = KEY_LINES.map((k) => result.lines[k]).filter(
    (l): l is Line =>
      !!l &&
      (l.amount !== 0 || ["1040.15", "1040.16", "1040.24"].includes(l.id)),
  );
  const forms = [...new Set(lines.map((l) => l.form))];
  const trace = selected ? result.explain(selected) : [];
  const supported = result.status !== "unsupported";

  const total = result.refund > 0 ? result.refund : result.owed;
  const headline =
    result.refund > 0
      ? "Refund"
      : result.owed > 0
        ? "You owe"
        : "Nothing owed or refunded";

  return (
    <div className="anim-fade flex min-h-0 flex-1 flex-col">
      <header className="ui-panel ui-header flex items-center gap-3 border-b border-border bg-surface px-3 py-3 sm:px-8 sm:py-4">
        <button
          type="button"
          onClick={onBack}
          className="ui-raised ui-pill flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-text-2 hover:bg-hover"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to chat
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.0625rem] font-semibold tracking-tight">
            Tax return, 2024
          </h1>
          <p className="truncate text-xs text-muted">
            Worked out by tax rules, not AI. Nothing here is sent anywhere or
            saved.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setS(example())}
          className="ui-raised ui-pill hidden h-10 rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-text-2 hover:bg-hover sm:block"
        >
          Load an example
        </button>
        <button
          type="button"
          onClick={() => {
            setS(blank());
            setSelected(null);
          }}
          className="ui-raised ui-pill h-10 rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-text-2 hover:bg-hover"
        >
          Clear
        </button>
      </header>

      <div className="scroll-fade flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-[1200px] items-start gap-5 px-4 pt-6 pb-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* ---- the facts ---- */}
          <div className="flex min-w-0 flex-col gap-4">
            <Card
              title="About you"
              description="Filing status and who is on the return. Ages are on December 31, 2024."
            >
              <div className="py-3">
                <Segmented<FilingStatus>
                  label="Filing status"
                  value={s.fs}
                  onChange={(fs) => set({ fs })}
                  options={[
                    { value: "single", label: "Single" },
                    { value: "mfj", label: "Married filing jointly" },
                    { value: "mfs", label: "Married filing separately" },
                    { value: "hoh", label: "Head of household" },
                    { value: "qss", label: "Surviving spouse" },
                  ]}
                />
              </div>
              <PersonFields
                title={s.fs === "mfj" ? "You" : "You"}
                p={s.primary}
                onChange={(primary) => set({ primary })}
              />
              {s.fs === "mfj" ? (
                <PersonFields
                  title="Your spouse"
                  p={s.spouse}
                  onChange={(spouse) => set({ spouse })}
                />
              ) : null}
              <div className="border-t border-border py-3">
                <Check
                  label="Someone else can claim me as a dependent"
                  checked={s.claimed}
                  onChange={(claimed) => set({ claimed })}
                />
              </div>
            </Card>

            <Card
              title="Dependents"
              description="Children and others you support. This sets the child tax credit and the earned income credit."
            >
              <div className="flex flex-col gap-3 py-3">
                {s.deps.map((d, i) => (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2"
                  >
                    <div className="min-w-32 flex-1">
                      <Text
                        label={`Dependent ${i + 1} name`}
                        placeholder="Name (optional)"
                        value={d.name}
                        onChange={(name) =>
                          set({
                            deps: s.deps.map((x) =>
                              x.id === d.id ? { ...x, name } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="w-28">
                      <Text
                        label={`Dependent ${i + 1} age on December 31`}
                        placeholder="Age"
                        value={d.age}
                        onChange={(v) =>
                          set({
                            deps: s.deps.map((x) =>
                              x.id === d.id
                                ? {
                                    ...x,
                                    age: v.replace(/\D/g, "").slice(0, 3),
                                  }
                                : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <Check
                      label="Valid SSN"
                      checked={d.ssn}
                      onChange={(ssn) =>
                        set({
                          deps: s.deps.map((x) =>
                            x.id === d.id ? { ...x, ssn } : x,
                          ),
                        })
                      }
                    />
                    <Check
                      label="Is your qualifying child"
                      checked={d.child}
                      onChange={(child) =>
                        set({
                          deps: s.deps.map((x) =>
                            x.id === d.id ? { ...x, child } : x,
                          ),
                        })
                      }
                    />
                    <Remove
                      label={`Remove dependent ${i + 1}`}
                      onClick={() =>
                        set({ deps: s.deps.filter((x) => x.id !== d.id) })
                      }
                    />
                  </div>
                ))}
                <Add
                  onClick={() =>
                    set({
                      deps: [
                        ...s.deps,
                        { id: id(), name: "", age: "", ssn: true, child: true },
                      ],
                    })
                  }
                >
                  Add a dependent
                </Add>
              </div>
            </Card>

            <Card
              title="Income"
              description="From your tax forms: W-2 (box 1 and box 2), 1099-INT, 1099-DIV, and 1099-G."
            >
              <div className="flex flex-col gap-3 py-3">
                <div className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">
                  Wages (Form W-2)
                </div>
                {s.w2s.map((w, i) => (
                  <div key={w.id} className="flex flex-wrap items-center gap-3">
                    <div className="min-w-32 flex-1">
                      <Text
                        label={`W-2 ${i + 1} employer`}
                        placeholder="Employer (optional)"
                        value={w.employer}
                        onChange={(employer) =>
                          set({
                            w2s: s.w2s.map((x) =>
                              x.id === w.id ? { ...x, employer } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="w-36">
                      <Money
                        label="Wages (box 1)"
                        value={w.wages}
                        onChange={(wages) =>
                          set({
                            w2s: s.w2s.map((x) =>
                              x.id === w.id ? { ...x, wages } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="w-36">
                      <Money
                        label="Tax withheld (box 2)"
                        value={w.withheld}
                        onChange={(withheld) =>
                          set({
                            w2s: s.w2s.map((x) =>
                              x.id === w.id ? { ...x, withheld } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <Remove
                      label={`Remove W-2 ${i + 1}`}
                      onClick={() =>
                        set({ w2s: s.w2s.filter((x) => x.id !== w.id) })
                      }
                    />
                  </div>
                ))}
                <Add
                  onClick={() =>
                    set({
                      w2s: [
                        ...s.w2s,
                        { id: id(), employer: "", wages: "", withheld: "" },
                      ],
                    })
                  }
                >
                  Add a W-2
                </Add>

                <div className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">
                  Interest (Form 1099-INT)
                </div>
                {s.interest.map((r, i) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-3">
                    <div className="min-w-32 flex-1">
                      <Text
                        label={`1099-INT ${i + 1} payer`}
                        placeholder="Bank (optional)"
                        value={r.payer}
                        onChange={(payer) =>
                          set({
                            interest: s.interest.map((x) =>
                              x.id === r.id ? { ...x, payer } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="w-36">
                      <Money
                        label="Interest (box 1)"
                        value={r.amount}
                        onChange={(amount) =>
                          set({
                            interest: s.interest.map((x) =>
                              x.id === r.id ? { ...x, amount } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="w-36">
                      <Money
                        label="Tax withheld (box 4)"
                        value={r.withheld}
                        onChange={(withheld) =>
                          set({
                            interest: s.interest.map((x) =>
                              x.id === r.id ? { ...x, withheld } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <Remove
                      label={`Remove interest ${i + 1}`}
                      onClick={() =>
                        set({
                          interest: s.interest.filter((x) => x.id !== r.id),
                        })
                      }
                    />
                  </div>
                ))}
                <Add
                  onClick={() =>
                    set({
                      interest: [
                        ...s.interest,
                        { id: id(), payer: "", amount: "", withheld: "" },
                      ],
                    })
                  }
                >
                  Add interest
                </Add>

                <div className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">
                  Dividends (Form 1099-DIV)
                </div>
                {s.dividends.map((r, i) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-3">
                    <div className="min-w-32 flex-1">
                      <Text
                        label={`1099-DIV ${i + 1} payer`}
                        placeholder="Payer (optional)"
                        value={r.payer}
                        onChange={(payer) =>
                          set({
                            dividends: s.dividends.map((x) =>
                              x.id === r.id ? { ...x, payer } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="w-32">
                      <Money
                        label="Ordinary (1a)"
                        value={r.ordinary}
                        onChange={(ordinary) =>
                          set({
                            dividends: s.dividends.map((x) =>
                              x.id === r.id ? { ...x, ordinary } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="w-32">
                      <Money
                        label="Qualified (1b)"
                        value={r.qualified}
                        onChange={(qualified) =>
                          set({
                            dividends: s.dividends.map((x) =>
                              x.id === r.id ? { ...x, qualified } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="w-32">
                      <Money
                        label="Withheld (4)"
                        value={r.withheld}
                        onChange={(withheld) =>
                          set({
                            dividends: s.dividends.map((x) =>
                              x.id === r.id ? { ...x, withheld } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <Remove
                      label={`Remove dividends ${i + 1}`}
                      onClick={() =>
                        set({
                          dividends: s.dividends.filter((x) => x.id !== r.id),
                        })
                      }
                    />
                  </div>
                ))}
                <Add
                  onClick={() =>
                    set({
                      dividends: [
                        ...s.dividends,
                        {
                          id: id(),
                          payer: "",
                          ordinary: "",
                          qualified: "",
                          withheld: "",
                        },
                      ],
                    })
                  }
                >
                  Add dividends
                </Add>

                <div className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">
                  Unemployment (Form 1099-G)
                </div>
                {s.unemployment.map((r, i) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-3">
                    <div className="min-w-32 flex-1">
                      <Text
                        label={`1099-G ${i + 1} payer`}
                        placeholder="State agency (optional)"
                        value={r.payer}
                        onChange={(payer) =>
                          set({
                            unemployment: s.unemployment.map((x) =>
                              x.id === r.id ? { ...x, payer } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="w-36">
                      <Money
                        label="Unemployment (box 1)"
                        value={r.amount}
                        onChange={(amount) =>
                          set({
                            unemployment: s.unemployment.map((x) =>
                              x.id === r.id ? { ...x, amount } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="w-36">
                      <Money
                        label="Tax withheld (box 4)"
                        value={r.withheld}
                        onChange={(withheld) =>
                          set({
                            unemployment: s.unemployment.map((x) =>
                              x.id === r.id ? { ...x, withheld } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <Remove
                      label={`Remove unemployment ${i + 1}`}
                      onClick={() =>
                        set({
                          unemployment: s.unemployment.filter(
                            (x) => x.id !== r.id,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
                <Add
                  onClick={() =>
                    set({
                      unemployment: [
                        ...s.unemployment,
                        { id: id(), payer: "", amount: "", withheld: "" },
                      ],
                    })
                  }
                >
                  Add unemployment
                </Add>
              </div>
            </Card>

            <Card
              title="Payments"
              description="Estimated tax you paid for 2024, including any overpayment applied from your 2023 return."
            >
              <div className="w-48 py-3">
                <Money
                  label="Estimated tax payments"
                  value={s.estimated}
                  onChange={(estimated) => set({ estimated })}
                />
              </div>
            </Card>
          </div>

          {/* ---- the answer ---- */}
          <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-0">
            <Card title="Your return">
              <div className="py-4">
                {supported ? (
                  <>
                    <div className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">
                      {headline}
                    </div>
                    <div
                      className="font-serif text-5xl leading-none tabular-nums"
                      aria-live="polite"
                    >
                      {total > 0 ? usd(total) : "$0"}
                    </div>
                  </>
                ) : (
                  <div className="text-sm font-medium text-error-fg">
                    This return can&apos;t be worked out yet.
                  </div>
                )}
                <div className="mt-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      result.status === "complete"
                        ? "bg-accent-soft text-accent-text"
                        : result.status === "incomplete"
                          ? "bg-warn-bg text-warn-fg"
                          : "bg-error-bg text-error-fg"
                    }`}
                  >
                    {result.status === "complete"
                      ? "Complete"
                      : result.status === "incomplete"
                        ? "Needs more information"
                        : "Not supported yet"}
                  </span>
                </div>
              </div>
              {result.issues.length ? (
                <ul className="flex flex-col gap-2 border-t border-border py-3">
                  {result.issues.map((i, n) => (
                    <li
                      key={n}
                      className={`rounded-lg px-3 py-2 text-[0.8125rem] ${i.kind === "unsupported" ? "bg-error-bg text-error-fg" : "bg-warn-bg text-warn-fg"}`}
                    >
                      {i.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>

            {supported ? (
              <Card
                title="Form 1040"
                description="Click any line to see how it was worked out."
              >
                <ul className="py-2">
                  {(showAll ? lines : key).map((l) => (
                    <LineRow
                      key={l.id}
                      line={l}
                      selected={selected === l.id}
                      onSelect={() =>
                        setSelected(selected === l.id ? null : l.id)
                      }
                    />
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-3 border-t border-border py-3 text-[0.8125rem] text-text-3">
                  <span>
                    Show every line, including all forms ({lines.length})
                  </span>
                  <Switch
                    label="Show every line"
                    checked={showAll}
                    onChange={setShowAll}
                  />
                </div>
                {showAll ? (
                  <p className="pb-3 text-xs text-muted">
                    Forms: {forms.join(", ")}.
                  </p>
                ) : null}
              </Card>
            ) : null}

            {trace.length ? (
              <Card
                title={`How line ${trace[0].line} was worked out`}
                description="The line, then the lines it came from."
              >
                <ol className="flex flex-col gap-3 py-3">
                  {trace.map((l, n) => (
                    <li key={l.id} className={n === 0 ? "" : "pl-4"}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium">
                          {l.form} line {l.line}: {l.label}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {usd(l.amount)}
                        </span>
                      </div>
                      <div className="text-[0.8125rem] text-text-3">
                        {l.how}
                      </div>
                      {l.cite ? (
                        <div className="text-xs text-muted">{l.cite}</div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </Card>
            ) : null}

            <p className="px-1 text-xs leading-snug text-muted">
              Covers simple 2024 federal returns: wages, interest, ordinary
              dividends, unemployment, the standard deduction, the child
              credits, and the earned income credit. Anything else is reported
              as unsupported rather than guessed. A draft to check, not tax
              advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
