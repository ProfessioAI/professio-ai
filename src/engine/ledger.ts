// The record the engine keeps while it works out a return: each line, the number on it, and how it
// got there. That record is what lets the screen answer "why is this line $X?" and link a number to
// its source.

export type Line = {
  id: string;
  /** "Form 1040", "Schedule 8812", ... */
  form: string;
  /** As printed on the form: "1a", "15", "Worksheet line 3". */
  line: string;
  label: string;
  amount: number;
  /** The rule in words, with the actual numbers, e.g. "11 minus 14 (not below zero)". */
  how: string;
  /** The lines this one was worked out from. */
  from: string[];
  /** Where the rule comes from. */
  cite?: string;
};

export type Issue = {
  kind: "unsupported" | "missing" | "warning";
  message: string;
};

export class Ledger {
  readonly lines = new Map<string, Line>();

  /** Records a line and returns its amount, so the next line can use it. */
  put(line: Line): number {
    this.lines.set(line.id, line);
    return line.amount;
  }

  amount(id: string): number {
    const l = this.lines.get(id);
    if (!l) throw new Error(`Line ${id} hasn't been worked out yet`);
    return l.amount;
  }

  /** A line and everything it was worked out from, nearest first. */
  explain(id: string, seen = new Set<string>()): Line[] {
    const l = this.lines.get(id);
    if (!l || seen.has(id)) return [];
    seen.add(id);
    return [l, ...l.from.flatMap((f) => this.explain(f, seen))];
  }
}
