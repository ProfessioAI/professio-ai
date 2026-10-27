import { z } from "zod";
import { defineTool } from "./define-tool";

// Example "API link". This one reads a small built-in reference table so it
// works offline; a real integration would call an outside service here
// (accounting software, a tax research API, a client file store) instead.

type NoticeInfo = {
  code: string;
  title: string;
  whatItMeans: string;
  responseWindow: string;
  commonNextSteps: string[];
  authority?: string;
};

const NOTICES: NoticeInfo[] = [
  {
    code: "CP2000",
    title: "Proposed changes: income or payments don't match IRS records",
    whatItMeans:
      "Information the IRS received from third parties (for example W-2s and 1099s) doesn't match the return. The notice proposes changes to tax, and may add penalties and interest. It is a proposal, not a bill.",
    responseWindow:
      "Respond by the date on the notice, generally 30 days from the notice date (60 days if the taxpayer is outside the U.S.).",
    commonNextSteps: [
      "Compare each listed item against the taxpayer's records and the filed return.",
      "Choose agree, partially agree, or disagree on the response form.",
      "Attach documentation supporting any disagreement (corrected 1099s, basis records, proof income was reported elsewhere).",
      "If there is no response, the IRS may issue a statutory notice of deficiency.",
    ],
  },
  {
    code: "CP2501",
    title: "Initial contact: income discrepancy",
    whatItMeans:
      "The IRS found a discrepancy between the return and third-party information and asks the taxpayer to explain or correct it. A CP2000 may follow if it isn't resolved.",
    responseWindow: "Respond by the date on the notice.",
    commonNextSteps: [
      "Identify the mismatched item and gather records.",
      "Explain the difference or confirm a correction is needed.",
    ],
  },
  {
    code: "CP14",
    title: "Balance due",
    whatItMeans: "First notice that the taxpayer owes tax on the account.",
    responseWindow:
      "Pay or contact the IRS by the date on the notice (usually about 21 days from the notice date).",
    commonNextSteps: [
      "Verify the balance against the return and payments made.",
      "Pay in full, or set up a payment plan if needed.",
      "Consider penalty relief (for example first-time abatement or reasonable cause) if eligible.",
    ],
  },
  {
    code: "CP501",
    title: "Reminder: unpaid balance",
    whatItMeans: "A reminder that a balance is still due.",
    responseWindow: "Pay or contact the IRS by the date on the notice.",
    commonNextSteps: ["Verify the balance.", "Pay or arrange a payment plan."],
  },
  {
    code: "CP503",
    title: "Second reminder: unpaid balance",
    whatItMeans:
      "A second reminder that a balance is still due. Collection action may follow.",
    responseWindow: "Pay or contact the IRS by the date on the notice.",
    commonNextSteps: [
      "Verify the balance.",
      "Pay or arrange a payment plan promptly.",
    ],
  },
  {
    code: "CP504",
    title: "Notice of intent to levy",
    whatItMeans:
      "The balance remains unpaid. The IRS may levy (seize) state tax refunds, and later other property or rights to property.",
    responseWindow: "Pay or contact the IRS by the date on the notice.",
    commonNextSteps: [
      "Act immediately: pay, set up a payment plan, or contact the IRS.",
      "Review collection alternatives (installment agreement, currently not collectible status, offer in compromise).",
    ],
  },
  {
    code: "LT11",
    title: "Final notice of intent to levy and notice of right to a hearing",
    whatItMeans:
      "Final notice before levy. It gives the taxpayer the right to a Collection Due Process (CDP) hearing with IRS Independent Office of Appeals.",
    responseWindow:
      "Request a CDP hearing (Form 12153) within 30 days of the notice date to keep the right to a hearing and later Tax Court review.",
    commonNextSteps: [
      "Calendar the 30-day CDP deadline.",
      "File Form 12153 if a hearing is wanted, and propose a collection alternative.",
      "Consider professional representation.",
    ],
    authority: "IRC §6330",
  },
  {
    code: "1058",
    title:
      "Letter 1058: Final notice of intent to levy and notice of right to a hearing",
    whatItMeans:
      "Same purpose as LT11: final notice before levy, with the right to a Collection Due Process (CDP) hearing.",
    responseWindow:
      "Request a CDP hearing (Form 12153) within 30 days of the notice date.",
    commonNextSteps: [
      "Calendar the 30-day CDP deadline.",
      "File Form 12153 if a hearing is wanted, and propose a collection alternative.",
    ],
    authority: "IRC §6330",
  },
  {
    code: "CP11",
    title: "Math error correction: balance due",
    whatItMeans:
      "The IRS corrected what it considers a math or clerical error on the return, and the taxpayer now owes tax.",
    responseWindow:
      "Request that the IRS reverse the change within 60 days of the notice date. After that, the assessment stands and the taxpayer loses the right to contest it in Tax Court before paying.",
    commonNextSteps: [
      "Compare the IRS change to the return.",
      "If the change is wrong, contact the IRS within 60 days to request abatement.",
    ],
    authority: "IRC §6213(b)",
  },
  {
    code: "CP12",
    title: "Math error correction: refund changed",
    whatItMeans:
      "The IRS corrected what it considers a math or clerical error, which changed the refund amount.",
    responseWindow:
      "Request that the IRS reverse the change within 60 days of the notice date.",
    commonNextSteps: [
      "Compare the IRS change to the return.",
      "If the change is wrong, contact the IRS within 60 days.",
    ],
    authority: "IRC §6213(b)",
  },
  {
    code: "525",
    title: "Letter 525: General 30-day letter (proposed examination changes)",
    whatItMeans:
      "After an examination (audit), the IRS proposes adjustments and explains the taxpayer's options.",
    responseWindow:
      "Generally 30 days from the letter date to agree, or to disagree and request an Appeals conference.",
    commonNextSteps: [
      "Review the examination report line by line.",
      "Sign the agreement form, or submit a protest and request Appeals.",
      "If there is no response, a statutory notice of deficiency may follow.",
    ],
  },
  {
    code: "CP3219A",
    title: "Statutory notice of deficiency (underreporter program)",
    whatItMeans:
      "The IRS has determined a deficiency, usually after an unresolved CP2000. This is the taxpayer's ticket to the U.S. Tax Court.",
    responseWindow:
      "Petition the U.S. Tax Court within 90 days of the notice date (150 days if addressed to someone outside the U.S.). This deadline is set by law and cannot be extended by the IRS.",
    commonNextSteps: [
      "Calendar the petition deadline immediately.",
      "Decide whether to petition the Tax Court or agree to the assessment.",
      "Consider professional representation.",
    ],
    authority: "IRC §§6212, 6213(a)",
  },
  {
    code: "3219",
    title: "Letter 3219: Statutory notice of deficiency",
    whatItMeans:
      "The IRS has determined a deficiency. This notice opens the right to petition the U.S. Tax Court before paying.",
    responseWindow:
      "Petition the U.S. Tax Court within 90 days of the notice date (150 days if addressed to someone outside the U.S.). This deadline cannot be extended by the IRS.",
    commonNextSteps: [
      "Calendar the petition deadline immediately.",
      "Decide whether to petition the Tax Court or agree to the assessment.",
    ],
    authority: "IRC §§6212, 6213(a)",
  },
];

const SOURCE_URL =
  "https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter";

/** "Letter 525", "ltr525", "cp 2000" -> "525", "525", "CP2000". */
function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^(LETTER|LTR)/, "");
}

const InputSchema = z.object({
  notice_code: z.string().min(1).max(40),
});

export const irsNoticeLookup = defineTool(
  {
    name: "lookup_irs_notice",
    description:
      "Look up a reference summary of an IRS notice or letter by its code (for example CP2000, CP14, CP504, LT11, Letter 525, CP3219A). Returns what the notice means, the usual response window, common next steps, and the governing authority when known. Use it whenever a notice code comes up. The date printed on the actual notice always controls over the usual window.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        notice_code: {
          type: "string",
          description:
            "The notice or letter code as printed, e.g. 'CP2000' or 'Letter 525'.",
        },
      },
      required: ["notice_code"],
      additionalProperties: false,
    },
  },
  InputSchema,
  ({ notice_code }) => {
    const wanted = normalizeCode(notice_code);
    const match = NOTICES.find((n) => normalizeCode(n.code) === wanted);
    if (!match) {
      return JSON.stringify({
        found: false,
        notice_code,
        message:
          "No reference entry for this code. Work from the notice itself and suggest checking the IRS notice lookup page.",
        known_codes: NOTICES.map((n) => n.code),
        source: SOURCE_URL,
      });
    }
    return JSON.stringify({
      found: true,
      code: match.code,
      title: match.title,
      what_it_means: match.whatItMeans,
      usual_response_window: match.responseWindow,
      common_next_steps: match.commonNextSteps,
      authority: match.authority ?? null,
      source: SOURCE_URL,
      note: "Reference summary for drafting only. Confirm the deadline printed on the notice.",
    });
  },
  ({ notice_code }) => {
    const match = NOTICES.find(
      (n) => normalizeCode(n.code) === normalizeCode(notice_code),
    );
    return match
      ? `Looked up ${match.code} in the notice reference`
      : `Checked the notice reference for ${notice_code}`;
  },
  "notice",
);
