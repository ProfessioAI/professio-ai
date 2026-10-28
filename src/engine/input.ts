import { z } from "zod";

// What the engine needs to know to work out a simple 2024 return. Everything is a plain value: the
// engine never reads documents or asks questions. Something else (the guided interview, the
// document reader) fills this in, and each value can carry where it came from.

const money = z.number().finite().min(0);

/** Where a value came from, so the final return can show it. */
export const Source = z
  .object({
    document: z.string().optional(),
    page: z.number().int().optional(),
    note: z.string().optional(),
  })
  .optional();

export const Person = z.object({
  /** 65 or older on the last day of the year (born before January 2, 1960 for 2024). */
  age65OrOlder: z.boolean().default(false),
  blind: z.boolean().default(false),
  /** Age on December 31 of the tax year. Needed for the earned income credit with no children. */
  ageAtYearEnd: z.number().int().min(0).max(120).optional(),
  /** Has a Social Security number valid for work (needed for the earned income credit). */
  hasValidSsn: z.boolean().default(true),
});

export const Dependent = z.object({
  name: z.string().optional(),
  /** Age on December 31 of the tax year. */
  ageAtYearEnd: z.number().int().min(0).max(120),
  /** Has a Social Security number valid for work, issued before the filing due date. */
  hasValidSsn: z.boolean(),
  /** Has any taxpayer ID number: a Social Security number, an ITIN, or an ATIN. */
  hasTaxId: z.boolean().default(true),
  /** Passes every test for a qualifying child (relationship, age, residency, support, joint return). */
  isQualifyingChild: z.boolean(),
  /** Qualifies as a child for the earned income credit: passes the child tests, has a valid SSN, and
   *  is under 19 (or under 24 and a full-time student, or permanently disabled). If left out, it is
   *  worked out from the child tests, the SSN, and an age under 19. */
  eligibleForEic: z.boolean().optional(),
});

export const W2 = z.object({
  employer: z.string().optional(),
  wages: money, // box 1
  federalWithheld: money.default(0), // box 2
  source: Source,
});

export const Interest = z.object({
  payer: z.string().optional(),
  taxableInterest: money,
  federalWithheld: money.default(0),
  source: Source,
});

export const Dividends = z.object({
  payer: z.string().optional(),
  ordinaryDividends: money, // box 1a
  qualifiedDividends: money.default(0), // box 1b
  federalWithheld: money.default(0),
  source: Source,
});

export const Unemployment = z.object({
  payer: z.string().optional(),
  amount: money, // box 1
  federalWithheld: money.default(0), // box 4
  source: Source,
});

export const ReturnInput = z.object({
  filingStatus: z.enum(["single", "mfj", "mfs", "hoh", "qss"]),
  primary: Person,
  /** Required for a joint return. */
  spouse: Person.optional(),
  /** Someone else can claim you as a dependent. */
  canBeClaimedAsDependent: z.boolean().default(false),
  dependents: z.array(Dependent).default([]),
  w2s: z.array(W2).default([]),
  interest: z.array(Interest).default([]),
  dividends: z.array(Dividends).default([]),
  unemployment: z.array(Unemployment).default([]),
  /** 2024 estimated tax payments, and any amount applied from the 2023 return. */
  estimatedPayments: money.default(0),
  /** The earned income credit was reduced or disallowed in an earlier year (Form 8862 needed). */
  eicPreviouslyDisallowed: z.boolean().default(false),
  /** The person wants to itemize (not supported yet). */
  wantsToItemize: z.boolean().default(false),
  /** Filing separately and the spouse itemizes, so this return must itemize too (not supported yet). */
  spouseItemizes: z.boolean().default(false),
});

export type ReturnInput = z.infer<typeof ReturnInput>;
export type ReturnInputRaw = z.input<typeof ReturnInput>;
