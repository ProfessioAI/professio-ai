"use client";

import { useId, useState } from "react";
import { PILOT_NAME } from "@/lib/config";
import { modelInfo } from "@/lib/models";
import {
  DEFAULT_SETTINGS,
  TEXT_LIMITS,
  type DateFormat,
  type Settings,
} from "@/lib/settings";
import { formatDate } from "@/components/chat/notice-utils";
import { CalendarIcon } from "@/components/chat/Icons";
import type { UsageMeter } from "@/components/chat/usage-store";
import {
  ActionButton,
  Card,
  ConfirmButton,
  Segmented,
  SettingRow,
  Switch,
  TextField,
  type Option,
} from "./controls";
import { clearLibrary } from "@/lib/library";
import CustomColors from "./CustomColors";
import { AccentPicker, FontPicker, ModelPicker, StylePicker } from "./pickers";
import { useSettings } from "./settings-store";

const TABS = [
  { id: "appearance", label: "Appearance" },
  { id: "chat", label: "Chat" },
  { id: "notices", label: "Notices" },
  { id: "practice", label: "Practice" },
  { id: "data", label: "Data & privacy" },
  { id: "about", label: "About" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const SAMPLE_DATE = "2026-10-31";
const dateOptions: Option<DateFormat>[] = (
  ["us", "numeric", "eu", "iso"] as const
).map((v) => ({
  value: v,
  label: formatDate(SAMPLE_DATE, true, v),
}));

type Patch = (p: Partial<Settings>) => void;

/** A small sample of the conversation, so appearance changes can be judged at a glance. */
function Preview() {
  return (
    <div
      aria-hidden="true"
      className="ui-inset ui-soft mb-4 rounded-xl border border-border bg-background p-4"
    >
      <div className="mb-1 text-xs font-semibold tracking-[0.06em] text-muted uppercase">
        Preview
      </div>
      <div className="flex flex-col gap-[var(--chat-gap)]">
        <div className="flex justify-end">
          <div className="ui-bubble max-w-[85%] rounded-[14px_14px_4px_14px] bg-user-bubble px-4 py-2.5 text-user-bubble-fg">
            What does this notice ask for?
          </div>
        </div>
        <div className="markdown">
          <div role="note" className="md-note">
            <CalendarIcon size={20} className="md-note-icon" />
            <div>
              <strong>Respond by {formatDate(SAMPLE_DATE, true)}.</strong> If
              there&apos;s no response, the IRS may send a notice of deficiency.
            </div>
          </div>
          <p>
            This is a <strong>CP2000</strong>: a proposal, not a bill. The total
            proposed is <code>$4,016.00</code>.
          </p>
        </div>
        <div>
          <span className="ui-primary inline-flex h-10 items-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-fg">
            Draft response letter
          </span>
        </div>
      </div>
    </div>
  );
}

function Block({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="mb-2.5 text-sm font-medium">{label}</div>
      {description ? (
        <p className="-mt-1.5 mb-2.5 text-[0.8125rem] leading-snug text-muted">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function Appearance({ s, set }: { s: Settings; set: Patch }) {
  return (
    <>
      <Preview />
      <Card title="Style, theme, and color">
        <Block
          label="Style"
          description="The overall look: shapes, panels, and fonts."
        >
          <StylePicker value={s.style} onChange={(style) => set({ style })} />
        </Block>
        <SettingRow
          label="Theme"
          description="System follows your computer's light or dark setting."
        >
          <Segmented
            label="Theme"
            value={s.theme}
            onChange={(theme) => set({ theme })}
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </SettingRow>
        <SettingRow
          label="Accent color"
          description={
            s.useCustomTheme
              ? "Your custom colors are on, so the accent comes from them (see Custom colors below)."
              : "Buttons, links, and highlights. The last circle opens a color wheel for any color."
          }
        >
          <AccentPicker
            value={s.accent}
            customHex={s.customAccent}
            onChange={(accent) => set({ accent })}
            onCustom={(customAccent) => set({ accent: "custom", customAccent })}
          />
        </SettingRow>
      </Card>
      <CustomColors s={s} set={set} />
      <Card title="Text and layout">
        <Block label="Font" description="Applies to the whole app.">
          <FontPicker value={s.font} onChange={(font) => set({ font })} />
        </Block>
        <SettingRow
          label="Text size"
          description="Scales the whole app, including buttons and spacing."
        >
          <Segmented
            label="Text size"
            value={s.textSize}
            onChange={(textSize) => set({ textSize })}
            options={[
              { value: "small", label: "Small" },
              { value: "default", label: "Default" },
              { value: "large", label: "Large" },
              { value: "xlarge", label: "Extra large" },
            ]}
          />
        </SettingRow>
        <SettingRow
          label="Spacing"
          description="Compact fits more of a long answer on screen."
        >
          <Segmented
            label="Spacing"
            value={s.density}
            onChange={(density) => set({ density })}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </SettingRow>
        {s.style === "glass" ? (
          <SettingRow
            label="Roundness"
            description="How rounded corners are in Glass. Applies to panels, buttons, and cards."
          >
            <Segmented
              label="Roundness"
              value={s.roundness}
              onChange={(roundness) => set({ roundness })}
              options={[
                { value: "square", label: "Square" },
                { value: "subtle", label: "Subtle" },
                { value: "soft", label: "Soft" },
                { value: "round", label: "Round" },
                { value: "extra", label: "Extra" },
              ]}
            />
          </SettingRow>
        ) : null}
        <SettingRow
          label="Reading width"
          description="How wide the conversation column is on large screens."
        >
          <Segmented
            label="Reading width"
            value={s.readingWidth}
            onChange={(readingWidth) => set({ readingWidth })}
            options={[
              { value: "narrow", label: "Narrow" },
              { value: "standard", label: "Standard" },
              { value: "wide", label: "Wide" },
            ]}
          />
        </SettingRow>
      </Card>
      <Card title="Motion">
        <SettingRow
          label="Reduce motion"
          description="Turns off animations and smooth scrolling. It's also on automatically if your computer asks for it."
        >
          <Switch
            label="Reduce motion"
            checked={s.motion === "reduced"}
            onChange={(on) => set({ motion: on ? "reduced" : "system" })}
          />
        </SettingRow>
      </Card>
    </>
  );
}

function Chat({ s, set }: { s: Settings; set: Patch }) {
  return (
    <>
      <Card
        title="LLM model"
        description="The large language model that writes the answers and reads your notices. Applies from your next message."
      >
        <Block label="Model">
          <ModelPicker value={s.model} onChange={(model) => set({ model })} />
          <p className="mt-3 text-[0.8125rem] leading-snug text-muted">
            Prices are what the model provider charges per million tokens, and
            the cost per answer is a guide. Changing the model in the middle of
            a conversation re-reads any attached documents at full price once.
            Every model writes drafts for professional review, and any of them
            can be wrong.
          </p>
        </Block>
      </Card>
      <Card
        title="Answers"
        description="These two are sent to the AI with each message."
      >
        <SettingRow
          label="Answer detail"
          description="Brief leads with the answer and next steps. Detailed explains the reasoning."
        >
          <Segmented
            label="Answer detail"
            value={s.replyDetail}
            onChange={(replyDetail) => set({ replyDetail })}
            options={[
              { value: "brief", label: "Brief" },
              { value: "standard", label: "Standard" },
              { value: "detailed", label: "Detailed" },
            ]}
          />
        </SettingRow>
        <SettingRow
          label="Client-facing tone"
          description="For emails and letters to clients. Letters to the IRS stay formal."
        >
          <Segmented
            label="Client-facing tone"
            value={s.draftTone}
            onChange={(draftTone) => set({ draftTone })}
            options={[
              { value: "professional", label: "Professional" },
              { value: "plain", label: "Plain language" },
            ]}
          />
        </SettingRow>
      </Card>
      <Card title="Typing and reading">
        <SettingRow
          label="Send with"
          description="The other key adds a new line."
        >
          <Segmented
            label="Send with"
            value={s.sendKey}
            onChange={(sendKey) => set({ sendKey })}
            options={[
              { value: "enter", label: "Enter" },
              { value: "modEnter", label: "⌘ / Ctrl + Enter" },
            ]}
          />
        </SettingRow>
        <SettingRow
          label="Scroll as answers are written"
          description="Keeps the newest text in view."
        >
          <Switch
            label="Scroll as answers are written"
            checked={s.autoScroll}
            onChange={(autoScroll) => set({ autoScroll })}
          />
        </SettingRow>
      </Card>
      <Card title="What to show in conversations">
        <SettingRow
          label="Tool activity"
          description='The "Looked up CP2000 in the notice reference" line.'
        >
          <Switch
            label="Show tool activity"
            checked={s.showToolChips}
            onChange={(showToolChips) => set({ showToolChips })}
          />
        </SettingRow>
        <SettingRow
          label="Follow-up suggestions"
          description="The buttons under the latest answer."
        >
          <Switch
            label="Show follow-up suggestions"
            checked={s.showFollowUps}
            onChange={(showFollowUps) => set({ showFollowUps })}
          />
        </SettingRow>
        <SettingRow
          label="Cost of each answer"
          description="The small estimate next to Copy."
        >
          <Switch
            label="Show cost of each answer"
            checked={s.showReplyCost}
            onChange={(showReplyCost) => set({ showReplyCost })}
          />
        </SettingRow>
      </Card>
      <p className="px-1 text-[0.8125rem] text-muted">
        The &ldquo;draft for professional review&rdquo; reminders under each
        answer are always shown.
      </p>
    </>
  );
}

function Notices({ s, set }: { s: Settings; set: Patch }) {
  return (
    <>
      <Card title="Notice details">
        <SettingRow
          label="Read notice details automatically"
          description="Fills the details panel (code, dates, amount) when you send a document. It costs a small extra amount per document; switch it off to skip that."
        >
          <Switch
            label="Read notice details automatically"
            checked={s.autoReadNotice}
            onChange={(autoReadNotice) => set({ autoReadNotice })}
          />
        </SettingRow>
        <SettingRow
          label="Details panel on wide screens"
          description="Hidden, you can still open it with the panel button."
        >
          <Segmented
            label="Details panel on wide screens"
            value={s.casePanel}
            onChange={(casePanel) => set({ casePanel })}
            options={[
              { value: "show", label: "Show" },
              { value: "hide", label: "Hide" },
            ]}
          />
        </SettingRow>
      </Card>
      <Card title="Deadlines and dates">
        <SettingRow
          label="Highlight deadlines within"
          description="Turns the countdown amber this many days before the deadline."
        >
          <Segmented
            label="Highlight deadlines within"
            value={s.warnDays}
            onChange={(warnDays) => set({ warnDays })}
            options={[
              { value: 3, label: "3 days" },
              { value: 7, label: "7 days" },
              { value: 14, label: "14 days" },
              { value: 30, label: "30 days" },
            ]}
          />
        </SettingRow>
        <SettingRow
          label="Date format"
          description="For dates shown in the details panel and the header."
        >
          <Segmented
            label="Date format"
            value={s.dateFormat}
            onChange={(dateFormat) => set({ dateFormat })}
            options={dateOptions}
          />
        </SettingRow>
      </Card>
    </>
  );
}

function Practice({ s, set }: { s: Settings; set: Patch }) {
  const uid = useId();
  const field = (
    key: "displayName" | "credentials" | "practiceName" | "phone" | "email",
  ) => ({
    id: `${uid}-${key}`,
    value: s[key],
    maxLength: TEXT_LIMITS[key],
    onCommit: (value: string) => set({ [key]: value }),
  });
  return (
    <>
      <Card
        title="Your details"
        description="Used to sign letters and emails you ask for, in place of [Your name] placeholders. Saved in this browser only."
      >
        <SettingRow label="Your name" htmlFor={`${uid}-displayName`}>
          <TextField
            {...field("displayName")}
            placeholder="Jordan Sample"
            autoComplete="name"
          />
        </SettingRow>
        <SettingRow
          label="Credentials"
          description="For example EA, CPA, or Esq."
          htmlFor={`${uid}-credentials`}
        >
          <TextField {...field("credentials")} placeholder="EA" />
        </SettingRow>
        <SettingRow label="Practice name" htmlFor={`${uid}-practiceName`}>
          <TextField
            {...field("practiceName")}
            placeholder="Sample Tax Services"
            autoComplete="organization"
          />
        </SettingRow>
        <SettingRow label="Phone" htmlFor={`${uid}-phone`}>
          <TextField
            {...field("phone")}
            type="tel"
            placeholder="(555) 010-0100"
            autoComplete="tel"
          />
        </SettingRow>
        <SettingRow label="Email" htmlFor={`${uid}-email`}>
          <TextField
            {...field("email")}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </SettingRow>
      </Card>
      <Card title="Using your details">
        <SettingRow
          label="Use these details when drafting"
          description="They're sent to the AI with your messages, so a drafted letter is signed with them. Turn off to keep placeholders."
        >
          <Switch
            label="Use these details when drafting"
            checked={s.usePracticeDetails}
            onChange={(usePracticeDetails) => set({ usePracticeDetails })}
          />
        </SettingRow>
      </Card>
      <p className="px-1 text-[0.8125rem] text-muted">
        Only your own contact details belong here. Don&apos;t put client
        information in any setting.
      </p>
    </>
  );
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Data({
  s,
  set,
  reset,
  meter,
  onCleared,
}: {
  s: Settings;
  set: Patch;
  reset: () => void;
  meter: UsageMeter;
  onCleared: () => void;
}) {
  return (
    <>
      <Card title="Saved conversations">
        <SettingRow
          label="Save conversations in this browser"
          description="Keeps your conversations, and the documents you attached, so you can come back to them. They never leave this browser. Turn off on a shared computer."
        >
          <Switch
            label="Save conversations in this browser"
            checked={s.saveChats}
            onChange={(saveChats) => set({ saveChats })}
          />
        </SettingRow>
        <SettingRow
          label="Delete saved conversations"
          description="Removes every saved conversation and folder from this browser."
        >
          <ConfirmButton
            label="Delete all"
            confirmLabel="Press again to delete"
            danger
            onConfirm={() => void clearLibrary()}
          />
        </SettingRow>
      </Card>
      <Card title="Usage meter">
        <SettingRow
          label="Show usage in the sidebar"
          description="Estimated cost of this conversation, today, and all time."
        >
          <Switch
            label="Show usage in the sidebar"
            checked={s.showUsageMeter}
            onChange={(showUsageMeter) => set({ showUsageMeter })}
          />
        </SettingRow>
        <SettingRow
          label="Show token details by default"
          description="Opens the token breakdown in the usage meter."
        >
          <Switch
            label="Show token details by default"
            checked={s.usageDetailsOpen}
            onChange={(usageDetailsOpen) => set({ usageDetailsOpen })}
          />
        </SettingRow>
      </Card>
      <Card title="Exporting">
        <SettingRow
          label="Export conversations as"
          description="Used by the Export button in a conversation."
        >
          <Segmented
            label="Export format"
            value={s.exportFormat}
            onChange={(exportFormat) => set({ exportFormat })}
            options={[
              { value: "markdown", label: "Markdown" },
              { value: "text", label: "Plain text" },
            ]}
          />
        </SettingRow>
        <SettingRow
          label="Download my settings"
          description="A JSON file of every option on this page."
        >
          <ActionButton
            label="Download"
            onClick={() =>
              download(
                "professioai-settings.json",
                JSON.stringify(s, null, 2) + "\n",
                "application/json",
              )
            }
          />
        </SettingRow>
      </Card>
      <Card title="Reset" description="Each button asks you to press it twice.">
        <SettingRow
          label="Reset settings"
          description="Puts every option back to its default. Usage totals are kept."
        >
          <ConfirmButton
            label="Reset settings"
            confirmLabel="Press again to reset"
            onConfirm={reset}
          />
        </SettingRow>
        <SettingRow
          label="Reset usage totals"
          description="Clears the usage meter's totals in this browser."
        >
          <ConfirmButton
            label="Reset usage"
            confirmLabel="Press again to reset"
            onConfirm={meter.resetAll}
          />
        </SettingRow>
        <SettingRow
          label="Clear everything stored here"
          description="Settings, usage totals, and saved conversations, from this browser."
        >
          <ConfirmButton
            label="Clear everything"
            confirmLabel="Press again to clear"
            danger
            onConfirm={() => {
              reset();
              meter.resetAll();
              void clearLibrary();
              onCleared();
            }}
          />
        </SettingRow>
      </Card>
      <Card title="What's stored, and where">
        <ul className="list-disc space-y-2 py-4 pl-5 text-[0.8125rem] leading-snug text-text-3">
          <li>
            <strong className="font-semibold text-foreground">
              Settings and usage totals
            </strong>{" "}
            are saved in this browser only.
          </li>
          <li>
            <strong className="font-semibold text-foreground">
              Conversations and documents
            </strong>{" "}
            are saved in this browser only, while &quot;Save conversations&quot;
            is on. They aren&apos;t uploaded anywhere except to the AI when you
            send them.
          </li>
          <li>
            <strong className="font-semibold text-foreground">
              Sent to the AI:
            </strong>{" "}
            your messages, the documents you attach, and the answer-style
            options and practice details above (when switched on).
          </li>
          <li>During the pilot, use fictional or public test data only.</li>
        </ul>
      </Card>
    </>
  );
}

function About({
  model,
  onChangeModel,
}: {
  model: string;
  onChangeModel: () => void;
}) {
  return (
    <>
      <Card title="ProfessioAI">
        <dl className="py-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-border py-2.5">
            <dt className="text-text-3">Pilot</dt>
            <dd className="font-medium">{PILOT_NAME}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-border py-2.5">
            <dt className="text-text-3">LLM model</dt>
            <dd className="flex items-center gap-3 font-medium">
              {modelInfo(model).name}
              <button
                type="button"
                onClick={onChangeModel}
                className="text-[0.8125rem] font-medium text-accent-text underline underline-offset-2"
              >
                Change
              </button>
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="text-text-3">Tools</dt>
            <dd className="font-medium">IRS notice reference</dd>
          </div>
        </dl>
      </Card>
      <Card title="Keyboard">
        <dl className="py-3 text-sm">
          {[
            ["Send", "Enter (or ⌘ / Ctrl + Enter, in Chat settings)"],
            ["New line", "Shift + Enter (or Enter)"],
            ["Move between choices", "← → arrow keys"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-4 border-b border-border py-2.5 last:border-b-0"
            >
              <dt className="text-text-3">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <p className="px-1 text-[0.8125rem] leading-snug text-muted">
        ProfessioAI writes drafts for review by a qualified professional. It is
        not tax or legal advice, and it can be wrong. Check every figure and
        date against the original before relying on it.
      </p>
    </>
  );
}

export default function SettingsView({
  onBack,
  meter,
}: {
  onBack: () => void;
  meter: UsageMeter;
}) {
  const { settings, update, reset } = useSettings();
  const [tab, setTab] = useState<TabId>("appearance");
  // Bumped after a reset so text fields start over from the new values.
  const [revision, setRevision] = useState(0);
  const tabsId = useId();

  const changed = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter(
    (k) => settings[k] !== DEFAULT_SETTINGS[k],
  ).length;

  function onTabKey(e: React.KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length].id;
    setTab(next);
    document.getElementById(`${tabsId}-tab-${next}`)?.focus();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
            Settings
          </h1>
          <p className="truncate text-xs text-muted">
            Saved in this browser ·{" "}
            {changed === 0 ? "all defaults" : `${changed} changed from default`}
          </p>
        </div>
      </header>

      <div className="scroll-fade flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[860px] px-4 pt-6 pb-12 sm:px-8">
          <div
            role="tablist"
            aria-label="Settings sections"
            className="mb-5 flex gap-1 overflow-x-auto border-b border-border"
          >
            {TABS.map((t, i) => (
              <button
                key={t.id}
                id={`${tabsId}-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`${tabsId}-panel`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`-mb-px min-h-11 shrink-0 border-b-2 px-3.5 text-sm font-medium whitespace-nowrap ${
                  tab === t.id
                    ? "border-accent-text text-foreground"
                    : "border-transparent text-text-3 hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div
            key={`${tab}-${revision}`}
            id={`${tabsId}-panel`}
            role="tabpanel"
            aria-labelledby={`${tabsId}-tab-${tab}`}
            className="flex flex-col gap-4 pb-8"
          >
            {tab === "appearance" && <Appearance s={settings} set={update} />}
            {tab === "chat" && <Chat s={settings} set={update} />}
            {tab === "notices" && <Notices s={settings} set={update} />}
            {tab === "practice" && <Practice s={settings} set={update} />}
            {tab === "data" && (
              <Data
                s={settings}
                set={update}
                reset={() => {
                  reset();
                  setRevision((r) => r + 1);
                }}
                meter={meter}
                onCleared={() => setRevision((r) => r + 1)}
              />
            )}
            {tab === "about" && (
              <About
                model={settings.model}
                onChangeModel={() => setTab("chat")}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
