// The skills the assistant has. A skill is something it can do beyond writing: look something up,
// calculate exactly, or work out dates. The chat shows which skills each answer used, and the
// person can pick one for a request.

export const SKILL_IDS = ["search", "calculate", "dates", "notice"] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export type SkillInfo = {
  id: SkillId;
  /** Short name for buttons and the skills row. */
  name: string;
  /** One line for the picker. */
  description: string;
  /** Said to the assistant when the person picks this skill for a request. */
  instruction: string;
};

export const SKILLS: SkillInfo[] = [
  {
    id: "search",
    name: "Search",
    description:
      "Look up current rules on IRS.gov and other official tax sites",
    instruction:
      "Use the web_search tool to check current official sources (IRS.gov and the other allowed tax sites) before you answer, and say which pages you relied on.",
  },
  {
    id: "calculate",
    name: "Calculate",
    description: "Exact math: totals, differences, percentages, penalties",
    instruction:
      "Use the calculate tool for every sum, difference, percentage, or total in your answer. Do not do arithmetic yourself.",
  },
  {
    id: "dates",
    name: "Dates",
    description:
      "Weekdays, day counts, and deadlines that skip weekends and holidays",
    instruction:
      "Use the check_dates tool for every weekday, day count, or deadline calculation in your answer. Do not work dates out yourself.",
  },
  {
    id: "notice",
    name: "Notice lookup",
    description:
      "Look up what an IRS notice code means and the usual next steps",
    instruction:
      "Use the lookup_irs_notice tool for the notice code involved, and reconcile it with the document.",
  },
];

export const skillInfo = (id: SkillId): SkillInfo =>
  SKILLS.find((s) => s.id === id) ?? SKILLS[0];

/** One use of a skill in an answer, as shown in the skills row. */
export type SkillUse = {
  id: SkillId;
  /** What was done, e.g. "Calculated [AMOUNT_1] x 0.25". May hold tokens; the page puts values back. */
  label: string;
  /** The pages a search read. */
  sources?: { title: string; url: string }[];
};

/** The web sites the search skill may read: official sources only. */
export const SEARCH_DOMAINS = [
  "irs.gov",
  "ustaxcourt.gov",
  "law.cornell.edu",
  "uscode.house.gov",
  "ecfr.gov",
  "federalregister.gov",
  "treasury.gov",
];
