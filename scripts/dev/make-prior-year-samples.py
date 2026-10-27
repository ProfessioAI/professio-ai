# Generates the fictional 2024 returns, transcripts, and intake lists in samples/prior-year/.
# Every figure is computed and checked here, so the documents add up. The only gaps are the ones
# planted on purpose, which are described in samples/prior-year/cases.json (not in the documents).
# Usage: python3 scripts/dev/make-prior-year-samples.py
import pathlib

D = pathlib.Path(__file__).resolve().parents[2] / "samples" / "prior-year"
D.mkdir(parents=True, exist_ok=True)
W = 74


def L(ref, label, val=None):
    if val is None:
        return f"{ref:<9} {label}"
    s = f"{val:,}" if isinstance(val, int) and val >= 0 else (f"({abs(val):,})" if isinstance(val, int) else str(val))
    left = f"{ref:<9} {label} "
    return f"{left}{'.' * max(2, W - len(left) - len(s) - 1)} {s}"


def page(n, total, title):
    return f"\n=== PAGE {n} of {total} — {title} ===\n"


TOP = "*** FICTIONAL SAMPLE FOR TESTING ONLY. Every name, number, and ID in this file is invented. ***\n"
END = "\n*** END OF FICTIONAL SAMPLE ***\n"


def bracket_tax(ti, brs):
    t = 0
    prev = 0
    for cap, r in brs:
        if ti > prev:
            t += (min(ti, cap) - prev) * r
        prev = cap
    return round(t)


SINGLE = [(11600, .10), (47150, .12), (100525, .22), (191950, .24)]
MFJ = [(23200, .10), (94300, .12), (201050, .22), (383900, .24)]
HOH = [(16550, .10), (63100, .12), (100500, .22)]


def write(name, parts):
    (D / name).write_text("\n".join(parts))


# ---------------- Case A: Rivera (capital loss carryover) ----------------
wages, inte = 78400, 212
st = [(2950, 5400), (4100, 7800)]
lt = [(6300, 14100), (5200, 7200)]
st_loss = sum(p - c for p, c in st)
lt_loss = sum(p - c for p, c in lt)
assert (st_loss, lt_loss) == (-6150, -9800)
net = st_loss + lt_loss
allowed = -3000
income = wages + inte + allowed
std = 14600
ti = income - std
tax = bracket_tax(ti, SINGLE)
wh = 9120
assert (income, ti, tax) == (75612, 61012, 8476)
refund = wh - tax
assert refund == 644
st_co, lt_co = 6150 - 3000, 9800
A = [TOP, """COPY OF FILED RETURN — TAX YEAR 2024
Prepared by: Harbor Light Tax Service (fictional)   PTIN: P00000001
Taxpayer: Jordan Rivera          SSN: XXX-XX-0000
Address: 88 Example Street, Sampleton, ST 00000
Filing status: Single            Filed electronically on 2025-03-14
"""]
A.append(page(1, 9, "Form 1040, page 1"))
A += [L("Line 1a", "Total amount from Form(s) W-2, box 1", wages), L("Line 1z", "Add lines 1a through 1h", wages),
      L("Line 2b", "Taxable interest", inte), L("Line 3b", "Ordinary dividends", 0),
      L("Line 7", "Capital gain or (loss). Attach Schedule D", allowed),
      L("Line 8", "Additional income from Schedule 1, line 10", 0), L("Line 9", "Total income", income),
      L("Line 10", "Adjustments to income from Schedule 1, line 26", 0), L("Line 11", "Adjusted gross income", income)]
A.append(page(2, 9, "Form 1040, page 2"))
A += [L("Line 12", "Standard deduction or itemized deductions", std), L("Line 13", "Qualified business income deduction", 0),
      L("Line 14", "Add lines 12 and 13", std), L("Line 15", "Taxable income", ti), L("Line 16", "Tax", tax),
      L("Line 24", "Total tax", tax), L("Line 25a", "Federal income tax withheld from Form(s) W-2", wh),
      L("Line 25d", "Total federal income tax withheld", wh),
      L("Line 26", "2024 estimated tax payments and amount applied from 2023 return", 0),
      L("Line 33", "Total payments", wh), L("Line 34", "Amount you overpaid", refund),
      L("Line 35a", "Amount of line 34 you want refunded to you", refund),
      L("Line 36", "Amount of line 34 you want applied to your 2025 estimated tax", 0)]
A.append(page(3, 9, "Schedule B, Interest and Ordinary Dividends"))
A += [L("Part I", "Interest"), L("Line 1", "First Example Savings Bank", inte), L("Line 4", "Total taxable interest", inte)]
A.append(page(4, 9, "Form 8949, Part I, Short-term (basis reported to the IRS, box A)"))
A += ["Broker: Cedar Ridge Brokerage (Form 1099-B)", "   Description          Proceeds     Cost basis    Gain or (loss)"]
for n, (p, c) in zip(["ZETA Corp, 100 sh", "Orbit Robotics, 40 sh"], st):
    A.append(f"   {n:<20} {p:>8,}     {c:>8,}        ({c - p:,})")
A.append(f"   Totals               {sum(p for p, c in st):>8,}     {sum(c for p, c in st):>8,}        ({-st_loss:,})")
A.append(page(5, 9, "Form 8949, Part II, Long-term (basis reported to the IRS, box D)"))
A += ["Broker: Cedar Ridge Brokerage (Form 1099-B)", "   Description          Proceeds     Cost basis    Gain or (loss)"]
for n, (p, c) in zip(["Larkspur Energy, 90 sh", "Delta Fund, 210 units"], lt):
    A.append(f"   {n:<20} {p:>8,}     {c:>8,}        ({c - p:,})")
A.append(f"   Totals               {sum(p for p, c in lt):>8,}     {sum(c for p, c in lt):>8,}        ({-lt_loss:,})")
A.append(page(6, 9, "Schedule D, Capital Gains and Losses"))
A += [L("Line 7", "Net short-term capital gain or (loss)", st_loss), L("Line 15", "Net long-term capital gain or (loss)", lt_loss),
      L("Line 16", "Combine lines 7 and 15", net),
      L("Line 21", "If line 16 is a loss, enter the smaller of the loss or ($3,000)", allowed)]
A.append(page(7, 9, "Standard deduction statement"))
A += [L("Line 1", "Standard deduction, single filer, not claimed as a dependent", std)]
A.append(page(8, 9, "Preparer's file: client letter"))
A += ["Dear Jordan,", "Your 2024 return was filed on March 14, 2025 and shows a refund of $644.",
      "Please keep the enclosed worksheets with your tax records.", "Harbor Light Tax Service"]
A.append(page(9, 9, "Capital Loss Carryover Worksheet (keep for your records)"))
A += [L("Line 1", "Taxable income, Form 1040 line 15", ti), L("Line 2", "Loss shown on Schedule D line 21, as a positive number", 3000),
      L("Line 3", "Add lines 1 and 2", ti + 3000), L("Line 4", "Smaller of line 2 or line 3", 3000),
      L("Line 5", "Short-term loss from Schedule D line 7, as a positive number", 6150),
      L("Line 6", "Short-term gain, Schedule D line 15", 0), L("Line 7", "Add lines 4 and 6", 3000),
      L("Line 8", "Short-term capital loss carryover to 2025 (line 5 minus line 7)", st_co),
      L("Line 9", "Long-term loss from Schedule D line 15, as a positive number", 9800),
      L("Line 10", "Long-term capital loss carryover to 2025", lt_co),
      L("Line 11", "Total capital loss carryover to 2025", st_co + lt_co)]
A.append(END)
write("rivera-return-2024.txt", A)
write("rivera-transcript-2024.txt", [TOP, """WAGE AND INCOME TRANSCRIPT — TAX YEAR 2024
Taxpayer: Jordan Rivera     SSN: XXX-XX-0000
Information reported to the IRS by payers

Form W-2
   Employer: Harborview Logistics Inc     EIN: 00-0000101
   Wages, tips, other compensation: 78,400      Federal income tax withheld: 9,120

Form 1099-INT
   Payer: First Example Savings Bank      EIN: 00-0000102
   Interest income: 212

Form 1099-INT
   Payer: Lakeshore Credit Union          EIN: 00-0000103
   Interest income: 48

Form 1099-B
   Payer: Cedar Ridge Brokerage           EIN: 00-0000104
   Proceeds: 18,550      Cost basis reported to the IRS: 34,500

Form 1099-B
   Payer: Pinewood Securities             EIN: 00-0000105
   Proceeds: 4,310       Cost basis reported to the IRS: 3,900
""", END])
write("rivera-received.txt", [TOP, """DOCUMENTS RECEIVED FROM CLIENT FOR 2025 INTAKE
Client: Jordan Rivera     Date received: 2026-01-12

   1. Form W-2, Harborview Logistics Inc, tax year 2024
   2. Form 1099-INT, First Example Savings Bank, tax year 2024
   3. Form 1099-B (consolidated), Cedar Ridge Brokerage, tax year 2024
   4. Copy of 2024 Form 1040 as filed (9 pages)
""", END])

# ---------------- Case B: Okafor (self-employed) ----------------
gross = 44900
exp = dict(advertising=650, depreciation=896, insurance=720, office=1134, software=2400, travel=1200, other=1400)
tot_exp = sum(exp.values())
assert tot_exp == 8400
net = gross - tot_exp
assert net == 36500
se_base = round(net * 0.9235)
se_tax = round(se_base * 0.153)
half = round(se_base * 0.153 / 2)
assert (se_base, se_tax, half) == (33708, 5157, 2579), (se_base, se_tax, half)
agi = net - half
std = 14600
qbi = min(round(0.2 * (net - half)), round(0.2 * (agi - std)))
assert qbi == 3864, qbi
ti = agi - std - qbi
tax = bracket_tax(ti, SINGLE)
assert (agi, ti, tax) == (33921, 15457, 1623), (agi, ti, tax)
tot_tax = tax + se_tax
est = 7980
over = est - tot_tax
assert (tot_tax, over) == (6780, 1200)
B = [TOP, """COPY OF FILED RETURN — TAX YEAR 2024
Prepared by: Summit Ledger & Co. (fictional)   PTIN: P00000002
Taxpayer: Taylor Okafor          SSN: XXX-XX-0000
Address: 17 Sample Avenue, Exampleville, ST 00000
Filing status: Single            Filed electronically on 2025-04-10
"""]
B.append(page(1, 9, "Form 1040, page 1"))
B += [L("Line 1z", "Add lines 1a through 1h", 0), L("Line 2b", "Taxable interest", 0),
      L("Line 8", "Additional income from Schedule 1, line 10", net), L("Line 9", "Total income", net),
      L("Line 10", "Adjustments to income from Schedule 1, line 26", half), L("Line 11", "Adjusted gross income", agi)]
B.append(page(2, 9, "Form 1040, page 2"))
B += [L("Line 12", "Standard deduction or itemized deductions", std), L("Line 13", "Qualified business income deduction", qbi),
      L("Line 14", "Add lines 12 and 13", std + qbi), L("Line 15", "Taxable income", ti), L("Line 16", "Tax", tax),
      L("Line 23", "Other taxes, including self-employment tax, from Schedule 2, line 21", se_tax),
      L("Line 24", "Total tax", tot_tax),
      L("Line 26", "2024 estimated tax payments and amount applied from 2023 return", est),
      L("Line 33", "Total payments", est), L("Line 34", "Amount you overpaid", over),
      L("Line 35a", "Amount of line 34 you want refunded to you", 0),
      L("Line 36", "Amount of line 34 you want applied to your 2025 estimated tax", over)]
B.append(page(3, 9, "Schedule 1, Additional Income and Adjustments"))
B += [L("Line 3", "Business income or (loss). Attach Schedule C", net), L("Line 10", "Combine lines 1 through 9", net),
      L("Line 15", "Deductible part of self-employment tax", half), L("Line 26", "Total adjustments to income", half)]
B.append(page(4, 9, "Schedule C, Profit or Loss From Business"))
B += ["Business: Okafor Design Studio (sole proprietor; graphic design)   Accounting method: cash",
      L("Line 1", "Gross receipts or sales", gross), L("Line 7", "Gross income", gross),
      L("Line 8", "Advertising", exp["advertising"]), L("Line 13", "Depreciation and section 179 deduction", exp["depreciation"]),
      L("Line 15", "Insurance (other than health)", exp["insurance"]), L("Line 18", "Office expense", exp["office"]),
      L("Line 27a", "Other expenses (software subscriptions)", exp["software"]), L("Line 24a", "Travel", exp["travel"]),
      L("Line 27a", "Other expenses (professional fees, phone)", exp["other"]),
      L("Line 28", "Total expenses", tot_exp), L("Line 31", "Net profit or (loss)", net)]
B.append(page(5, 9, "Schedule SE, Self-Employment Tax"))
B += [L("Line 2", "Net profit from Schedule C, line 31", net), L("Line 4a", "Multiply line 2 by 92.35%", se_base),
      L("Line 12", "Self-employment tax", se_tax), L("Line 13", "Deduction for one-half of self-employment tax", half)]
B.append(page(6, 9, "Form 8995, Qualified Business Income Deduction"))
B += [L("Line 1", "Okafor Design Studio, qualified business income", net - half), L("Line 15", "Qualified business income deduction", qbi)]
B.append(page(7, 9, "Form 4562 statement: depreciation schedule"))
B += ["Asset: Laptop computer and two monitors, 5-year property, half-year convention",
      "Placed in service: 2023-06-12      Cost basis: 2,800",
      L("2023", "Depreciation allowed (20.00%)", 560), L("2024", "Depreciation this year (32.00%)", 896),
      L("", "Total depreciation taken through 2024", 1456), L("", "Remaining basis to depreciate after 2024", 1344),
      L("2025", "Scheduled depreciation (19.20%)", 538)]
B.append(page(8, 9, "Form 8606, Nondeductible IRAs"))
B += [L("Line 1", "Nondeductible contributions to traditional IRAs for 2024", 6500),
      L("Line 2", "Total basis in traditional IRAs for 2023 and earlier years", 6500),
      L("Line 3", "Add lines 1 and 2", 13000), L("Line 6", "Value of all traditional IRAs at the end of 2024", 31200),
      L("Line 7", "Distributions from traditional IRAs in 2024", 0),
      L("Line 14", "Total basis in traditional IRAs for 2024 and earlier years", 13000)]
B.append(page(9, 9, "Estimated tax payment record, 2024"))
B += ["   Payment date    Amount", "   2024-04-15      1,995", "   2024-06-17      1,995",
      "   2024-09-16      1,995", "   2025-01-15      1,995", L("", "Total paid for 2024", est)]
B.append(END)
write("okafor-return-2024.txt", B)
write("okafor-transcript-2024.txt", [TOP, """WAGE AND INCOME TRANSCRIPT — TAX YEAR 2024
Taxpayer: Taylor Okafor     SSN: XXX-XX-0000
Information reported to the IRS by payers

Form 1099-NEC
   Payer: Birchwood Media Group     EIN: 00-0000201
   Nonemployee compensation: 44,900

Form 1099-NEC
   Payer: Elm Street Studio         EIN: 00-0000202
   Nonemployee compensation: 3,200

Form 5498
   Trustee: Cedar Pond Bank (traditional IRA)   EIN: 00-0000203
   IRA contributions: 6,500      Fair market value of account: 31,200
""", END])
write("okafor-received.txt", [TOP, """DOCUMENTS RECEIVED FROM CLIENT FOR 2025 INTAKE
Client: Taylor Okafor     Date received: 2026-01-20

   1. Form 1099-NEC, Birchwood Media Group, tax year 2024
   2. Spreadsheet of 2024 business expenses
   3. Copy of 2024 Form 1040 as filed (9 pages)
   4. Form 5498, Cedar Pond Bank, tax year 2024
""", END])

# ---------------- Case C: Nguyen (MFJ, rental, passive loss) ----------------
alex, sam = 112000, 64300
wages = alex + sam
inte = 640
rent = 21600
rexp = dict(insurance=1150, mortgage_interest=9100, repairs=2350, taxes=3600, utilities=1300, management=1728, depreciation=6200)
tot = sum(rexp.values())
rnet = rent - tot
assert rnet == -3828, rnet
prior = 5200
unallowed = -rnet + prior
assert unallowed == 9028
income = wages + inte
std = 29200
ti = income - std
tax = bracket_tax(ti, MFJ)
assert (income, ti, tax) == (176940, 147740, 22609), (income, ti, tax)
ctc = 2000
tot_tax = tax - ctc
wh = 17400 + 6100
refund = wh - tot_tax
assert (tot_tax, wh, refund) == (20609, 23500, 2891)
C = [TOP, """COPY OF FILED RETURN — TAX YEAR 2024
Prepared by: Lantern Row Accounting (fictional)   PTIN: P00000003
Taxpayers: Alex Nguyen and Sam Nguyen      SSNs: XXX-XX-0000 and XXX-XX-0000
Address: 301 Placeholder Lane, Samplewood, ST 00000
Filing status: Married filing jointly      Filed electronically on 2025-03-28
Dependent: Riley Nguyen (child, age 8)
Total pages in the filed return: 8
"""]
C.append(page(1, 8, "Form 1040, page 1"))
C += [L("Line 1a", "Total amount from Form(s) W-2, box 1", wages), L("Line 1z", "Add lines 1a through 1h", wages),
      L("Line 2b", "Taxable interest", inte), L("Line 8", "Additional income from Schedule 1, line 10", 0),
      L("Line 9", "Total income", income), L("Line 10", "Adjustments to income from Schedule 1, line 26", 0),
      L("Line 11", "Adjusted gross income", income)]
C.append(page(2, 8, "Form 1040, page 2"))
C += [L("Line 12", "Standard deduction or itemized deductions", std), L("Line 14", "Add lines 12 and 13", std),
      L("Line 15", "Taxable income", ti), L("Line 16", "Tax", tax),
      L("Line 19", "Child tax credit and credit for other dependents", ctc),
      L("Line 22", "Subtract line 21 from line 18", tot_tax), L("Line 24", "Total tax", tot_tax),
      L("Line 25a", "Federal income tax withheld from Form(s) W-2", wh), L("Line 33", "Total payments", wh),
      L("Line 34", "Amount you overpaid", refund), L("Line 35a", "Amount of line 34 you want refunded to you", refund),
      L("Line 36", "Amount of line 34 you want applied to your 2025 estimated tax", 0)]
C.append(page(3, 8, "Wages and Schedule B"))
C += ["Form W-2, Pioneer Health Group (Alex)  box 1 wages: 112,000   box 2 withholding: 17,400",
      "Form W-2, Redwood Unified School District (Sam)  box 1 wages: 64,300   box 2 withholding: 6,100",
      L("Sch B line 1", "Lakeview Bank interest", inte), L("Sch B line 4", "Total taxable interest", inte)]
C.append(page(4, 8, "Schedule E, Part I, Rental Real Estate"))
C += ["Property A: 412 Maple Court, Samplewood, ST 00000 (single-family rental, 365 days rented)",
      L("Line 3", "Rents received", rent), L("Line 9", "Insurance", rexp["insurance"]),
      L("Line 12", "Mortgage interest paid to banks", rexp["mortgage_interest"]),
      L("Line 14", "Repairs", rexp["repairs"]), L("Line 16", "Taxes", rexp["taxes"]),
      L("Line 17", "Utilities", rexp["utilities"]), L("Line 11", "Management fees", rexp["management"]),
      L("Line 18", "Depreciation expense or depletion (Form 4562 attached)", rexp["depreciation"]),
      L("Line 20", "Total expenses", tot), L("Line 21", "Income or (loss) from rental real estate", rnet),
      L("Line 22", "Deductible rental real estate loss after limitation, from Form 8582", 0),
      L("Line 26", "Total rental real estate and royalty income or (loss)", 0)]
C.append(page(5, 8, "Form 8582, Passive Activity Loss Limitations"))
C += [L("Line 1a", "Activities with net income", 0), L("Line 1b", "Activities with net loss (412 Maple Court)", rnet),
      L("Line 1c", "Prior years' unallowed losses", -prior), L("Line 1d", "Combine lines 1a, 1b, and 1c", rnet - prior),
      L("Line 6", "Modified adjusted gross income", income),
      L("Line 9", "Special allowance (phased out at this income)", 0),
      L("Line 16", "Total losses allowed from all passive activities", 0),
      "Worksheet 5, Allocation of unallowed losses",
      L("", "412 Maple Court: current year loss", 3828), L("", "412 Maple Court: prior years' unallowed loss", 5200),
      L("", "Unallowed loss carried forward to 2025", unallowed)]
C.append(page(6, 8, "Form 8812, Credits for Qualifying Children"))
C += [L("Line 4", "Number of qualifying children under age 17", 1), L("Line 5", "Multiply line 4 by $2,000", 2000),
      L("Line 14", "Child tax credit", ctc)]
C.append(page(7, 8, "Dependent information"))
C += ["Riley Nguyen, SSN XXX-XX-0000, relationship: child, born 2016, lived with taxpayers all year"]
C.append(page(8, 8, "Preparer's file: refund summary"))
C += ["Federal refund: 2,891, direct deposit to account on file"]
C.append(END)
write("nguyen-return-2024.txt", C)
write("nguyen-transcript-2024.txt", [TOP, """WAGE AND INCOME TRANSCRIPT — TAX YEAR 2024
Taxpayers: Alex Nguyen and Sam Nguyen     SSNs: XXX-XX-0000 and XXX-XX-0000
Information reported to the IRS by payers

Form W-2 (Alex Nguyen)
   Employer: Pioneer Health Group              EIN: 00-0000301
   Wages, tips, other compensation: 112,000     Federal income tax withheld: 17,400

Form W-2 (Sam Nguyen)
   Employer: Redwood Unified School District   EIN: 00-0000302
   Wages, tips, other compensation: 66,100      Federal income tax withheld: 6,100

Form 1099-INT
   Payer: Lakeview Bank                         EIN: 00-0000303
   Interest income: 640

Form 1098 (mortgage interest statement)
   Lender: First Example Mortgage               EIN: 00-0000304
   Mortgage interest received: 9,100
""", END])
write("nguyen-received.txt", [TOP, """DOCUMENTS RECEIVED FROM CLIENT FOR 2025 INTAKE
Clients: Alex and Sam Nguyen     Date received: 2026-01-27

   1. Form W-2, Pioneer Health Group, tax year 2024
   2. Form W-2, Redwood Unified School District, tax year 2024
   3. Form 1099-INT, Lakeview Bank, tax year 2024
   4. Form 1098, First Example Mortgage, tax year 2024
   5. Copy of 2024 Form 1040 as filed (8 pages)
""", END])

# ---------------- Case D: Patel (partial copy of the return) ----------------
wages = 51200
sch1 = 2400
income = wages + sch1
std = 21900
ti = income - std
tax = bracket_tax(ti, HOH)
assert (income, ti, tax) == (53600, 31700, 3473), (income, ti, tax)
ctc = 2000
tot_tax = tax - ctc
wh = 3900
refund = wh - tot_tax
assert (tot_tax, refund) == (1473, 2427)
Dd = [TOP, """PHOTOCOPY OF FILED RETURN — TAX YEAR 2024 (client's own copy)
Taxpayer: Casey Patel          SSN: XXX-XX-0000
Address: 9 Demo Road, Testford, ST 00000
Filing status: Head of household      Dependent: Morgan Patel (child)
Total pages in the filed return: 7      Pages in this copy: 1, 2, and 5
Preparer: name not shown on the copy
"""]
Dd.append(page(1, 7, "Form 1040, page 1"))
Dd += [L("Line 1a", "Total amount from Form(s) W-2, box 1", wages), L("Line 1z", "Add lines 1a through 1h", wages),
       L("Line 2b", "Taxable interest", 0), L("Line 4b", "Taxable amount of IRA distributions", 0),
       L("Line 8", "Additional income from Schedule 1, line 10", sch1), L("Line 9", "Total income", income),
       L("Line 10", "Adjustments to income from Schedule 1, line 26", 0), L("Line 11", "Adjusted gross income", income)]
Dd.append(page(2, 7, "Form 1040, page 2"))
Dd += [L("Line 12", "Standard deduction or itemized deductions", std), L("Line 15", "Taxable income", ti),
       L("Line 16", "Tax", tax), L("Line 19", "Child tax credit and credit for other dependents", ctc),
       L("Line 24", "Total tax", tot_tax), L("Line 25a", "Federal income tax withheld from Form(s) W-2", wh),
       L("Line 33", "Total payments", wh), L("Line 34", "Amount you overpaid", refund),
       L("Line 35a", "Amount of line 34 you want refunded to you", refund),
       L("Line 36", "Amount of line 34 you want applied to your 2025 estimated tax", 0)]
Dd.append(page(5, 7, "Form 8812, Credits for Qualifying Children"))
Dd += [L("Line 4", "Number of qualifying children under age 17", 1), L("Line 14", "Child tax credit", ctc)]
Dd.append(END)
write("patel-return-2024.txt", Dd)
write("patel-transcript-2024.txt", [TOP, """WAGE AND INCOME TRANSCRIPT — TAX YEAR 2024
Taxpayer: Casey Patel     SSN: XXX-XX-0000
Information reported to the IRS by payers

Form W-2
   Employer: Lakeshore Dental Group              EIN: 00-0000401
   Wages, tips, other compensation: 51,200        Federal income tax withheld: 3,900

Form 1099-G
   Payer: State Department of Labor              EIN: 00-0000402
   Unemployment compensation: 3,100

Form 1099-R
   Payer: Meridian Retirement Services           EIN: 00-0000403
   Gross distribution: 9,800   Taxable amount: 9,800   Distribution code: 1   Federal income tax withheld: 980
""", END])
write("patel-received.txt", [TOP, """DOCUMENTS RECEIVED FROM CLIENT FOR 2025 INTAKE
Client: Casey Patel     Date received: 2026-02-03

   1. Form W-2, Lakeshore Dental Group, tax year 2024
   2. Photocopy of 2024 Form 1040, pages 1, 2, and 5 only
""", END])
print("wrote", len(list(D.glob("*.txt"))), "files to", D)
