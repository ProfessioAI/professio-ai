// Federal income tax rules for tax year 2024 (returns filed in 2025). Every number here comes from
// IRS guidance for that year (Rev. Proc. 2023-34, the 2024 Form 1040 instructions, and the
// Schedule 8812 instructions). To support another year, add a file like this one.

export type FilingStatus = "single" | "mfj" | "mfs" | "hoh" | "qss";

export const YEAR = 2024;

/** Upper limit of each bracket (null = no limit) and its rate, lowest bracket first. */
export type Bracket = { upTo: number | null; rate: number };

export const BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [
    { upTo: 11_600, rate: 0.1 },
    { upTo: 47_150, rate: 0.12 },
    { upTo: 100_525, rate: 0.22 },
    { upTo: 191_950, rate: 0.24 },
    { upTo: 243_725, rate: 0.32 },
    { upTo: 609_350, rate: 0.35 },
    { upTo: null, rate: 0.37 },
  ],
  mfj: [
    { upTo: 23_200, rate: 0.1 },
    { upTo: 94_300, rate: 0.12 },
    { upTo: 201_050, rate: 0.22 },
    { upTo: 383_900, rate: 0.24 },
    { upTo: 487_450, rate: 0.32 },
    { upTo: 731_200, rate: 0.35 },
    { upTo: null, rate: 0.37 },
  ],
  mfs: [
    { upTo: 11_600, rate: 0.1 },
    { upTo: 47_150, rate: 0.12 },
    { upTo: 100_525, rate: 0.22 },
    { upTo: 191_950, rate: 0.24 },
    { upTo: 243_725, rate: 0.32 },
    { upTo: 365_600, rate: 0.35 },
    { upTo: null, rate: 0.37 },
  ],
  hoh: [
    { upTo: 16_550, rate: 0.1 },
    { upTo: 63_100, rate: 0.12 },
    { upTo: 100_500, rate: 0.22 },
    { upTo: 191_950, rate: 0.24 },
    { upTo: 243_700, rate: 0.32 },
    { upTo: 609_350, rate: 0.35 },
    { upTo: null, rate: 0.37 },
  ],
  // A qualifying surviving spouse uses the joint brackets.
  qss: [
    { upTo: 23_200, rate: 0.1 },
    { upTo: 94_300, rate: 0.12 },
    { upTo: 201_050, rate: 0.22 },
    { upTo: 383_900, rate: 0.24 },
    { upTo: 487_450, rate: 0.32 },
    { upTo: 731_200, rate: 0.35 },
    { upTo: null, rate: 0.37 },
  ],
};

export const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 14_600,
  mfs: 14_600,
  mfj: 29_200,
  qss: 29_200,
  hoh: 21_900,
};

/** Added once for each of: age 65 or older, blind (and for each spouse on a joint return). */
export const ADDITIONAL_STANDARD_DEDUCTION = {
  /** Single and head of household. */
  unmarried: 1_950,
  /** Married filing jointly or separately, and qualifying surviving spouse. */
  married: 1_550,
};

/** Someone who can be claimed as a dependent: the larger of $1,300 or earned income plus $450,
 *  but never more than the regular standard deduction. */
export const DEPENDENT_STANDARD_DEDUCTION = { floor: 1_300, plusEarned: 450 };

/** The Tax Table (used under $100,000 of taxable income) lists rows; tax is figured on each row's
 *  midpoint. Rows are 5 or 10 wide at the very bottom, 25 wide up to 3,000, then 50 wide. */
export const TAX_TABLE_LIMIT = 100_000;

export const CHILD_TAX_CREDIT = {
  perChild: 2_000,
  perOtherDependent: 500,
  /** The refundable part (Additional Child Tax Credit), per child. */
  refundablePerChild: 1_700,
  /** Credit starts to shrink above this adjusted gross income. */
  phaseOutStart: { mfj: 400_000, other: 200_000 },
  /** Reduced by this much for each $1,000 (or part of $1,000) above the start. */
  phaseOutPerThousand: 50,
  /** The refundable credit is 15% of earned income above this amount. */
  earnedIncomeFloor: 2_500,
  earnedIncomeRate: 0.15,
  /** A child must be under this age at the end of the year. */
  childUnderAge: 17,
};

/**
 * Earned income credit parameters by number of qualifying children (0, 1, 2, 3 or more), from Rev.
 * Proc. 2023-34 and the 2024 Form 1040 instructions. The credit grows at `rate` of earned income
 * until `earnedIncomeAmount`, stays at `maxCredit` until the phase-out start, then shrinks at
 * `phaseOutRate` of income above that. It is checked against every row of the IRS EIC Table.
 */
export const EARNED_INCOME_CREDIT = {
  /** Investment income (interest, dividends, capital gains) must be at most this. */
  investmentIncomeLimit: 11_600,
  rate: [0.0765, 0.34, 0.4, 0.45],
  earnedIncomeAmount: [8_260, 12_390, 17_400, 17_400],
  maxCredit: [632, 4_213, 6_960, 7_830],
  phaseOutRate: [0.0765, 0.1598, 0.2106, 0.2106],
  phaseOutStart: {
    other: [10_330, 22_720, 22_720, 22_720],
    mfj: [17_250, 29_640, 29_640, 29_640],
  },
  /** Earned income / AGI at which the credit has fully phased out. */
  completedPhaseOut: {
    other: [18_591, 49_084, 55_768, 59_899],
    mfj: [25_511, 56_004, 62_688, 66_819],
  },
  /** A filer with no qualifying children must be at least this old and under this age. */
  childlessAgeRange: { min: 25, maxExclusive: 65 },
  /** The EIC Table lists $50 rows, the first being $1 to $50. */
  tableRow: 50,
};
