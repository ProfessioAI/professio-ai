import { useEffect, useState } from "react";
import {
  formatTokens,
  formatUsd,
  totalTokens,
  type UsageReport,
} from "@/lib/usage";
import { useSettings } from "@/components/settings/settings-store";
import type { UsageMeter as Meter } from "./usage-store";

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-text-3">{label}</dt>
      <dd
        className={`tabular-nums ${strong ? "font-semibold" : "font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function tokenRows(t: UsageReport["tokens"]) {
  return [
    ["Input", t.input],
    ["Cached input", t.cacheRead],
    ["Cache writes", t.cacheWrite],
    ["Output", t.output],
  ] as const;
}

export default function UsageMeter({ meter }: { meter: Meter }) {
  const { conversation, todayUsd, total, since, resetAll } = meter;
  const { settings } = useSettings();
  const [confirming, setConfirming] = useState(false);

  // The reset button asks twice, and goes back to normal if left alone.
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  const hasUsage = total.costUsd > 0 || totalTokens(total.tokens) > 0;
  const sinceLabel = since
    ? new Date(since).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <section
      aria-label="AI usage"
      className="ui-inset ui-soft rounded-[10px] border border-border px-3.5 py-3 text-[0.8125rem]"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">
          Usage
        </h2>
        <span
          className="text-[0.6875rem] text-muted"
          title="Estimated from tokens used, at published prices"
        >
          estimate
        </span>
      </div>

      {hasUsage ? (
        <>
          <dl className="flex flex-col gap-1">
            <Row
              label="This conversation"
              value={formatUsd(conversation.costUsd)}
              strong
            />
            <Row label="Today" value={formatUsd(todayUsd)} />
            <Row label="All time" value={formatUsd(total.costUsd)} />
          </dl>

          <details
            open={settings.usageDetailsOpen}
            className="group mt-2.5 border-t border-border pt-2"
          >
            <summary className="cursor-pointer list-none text-xs text-text-3 hover:text-foreground">
              <span className="underline decoration-dotted underline-offset-2">
                Token details
              </span>
            </summary>
            <table className="mt-2 w-full text-xs tabular-nums">
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="pb-1 text-left font-medium" />
                  <th scope="col" className="pb-1 text-right font-medium">
                    Chat
                  </th>
                  <th scope="col" className="pb-1 text-right font-medium">
                    All
                  </th>
                </tr>
              </thead>
              <tbody>
                {tokenRows(conversation.tokens).map(([label, n], i) => (
                  <tr key={label}>
                    <th
                      scope="row"
                      className="py-0.5 text-left font-normal text-text-3"
                    >
                      {label}
                    </th>
                    <td className="py-0.5 text-right">{formatTokens(n)}</td>
                    <td className="py-0.5 text-right">
                      {formatTokens(tokenRows(total.tokens)[i][1])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!total.priceKnown ? (
              <p className="mt-2 text-[0.6875rem] leading-snug text-muted">
                Some usage was on a model without a known price, so it&apos;s
                counted at the highest rate.
              </p>
            ) : null}
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="text-[0.6875rem] text-muted">
                {sinceLabel ? `Since ${sinceLabel}` : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirming) {
                    resetAll();
                    setConfirming(false);
                  } else {
                    setConfirming(true);
                  }
                }}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  confirming
                    ? "bg-error-bg text-error-fg"
                    : "text-text-3 hover:bg-hover"
                }`}
              >
                {confirming ? "Confirm reset" : "Reset totals"}
              </button>
            </div>
          </details>
        </>
      ) : (
        <p className="text-muted">
          Nothing used yet. Costs appear here after your first reply.
        </p>
      )}

      <p className="mt-2.5 text-[0.6875rem] leading-snug text-muted">
        Counted in this browser. Replies you stop early aren&apos;t included.
      </p>
    </section>
  );
}
