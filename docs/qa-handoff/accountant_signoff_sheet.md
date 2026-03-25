# Buoyance QA: Domain Expert Sign-Off Sheet

**Purpose:** This document is the formal approval ledger for the NTA 2025 tax compliance logic implemented in the Buoyance application. While the code executes accurately according to its programming, a certified tax accountant or domestic legal counsel must verify that the *statutory interpretation* matches official FIRS methodologies.

**Reviewer Instructions:** Review the *Observed Result* against the *Expected Statutory Interpretation*. Mark your decision, print your name, and sign.

---

### Test C1: Rent Relief Cap Enforcement
* **Scenario Tested:** A hypothetical user earning ₦10,000,000 per annum base salary inputted ₦3,000,000 in rent expense.
* **Observed Result:** The internal calculator correctly limited the rent relief deduction to precisely `₦200,000`. The code algorithm is `MIN(Rent Paid, 200000, 1/6 of gross)`.
* **Expected Statutory Interpretation:** Ensure the ₦200k absolute cap and 1/6th rule from the NTA 2025 matches FIRS assessment instructions.
* **Decision:** `[ ] Accept    [ ] Reject    [ ] Needs Revision`
* **Reviewer Name:** ___________________________
* **Signature/Date:** ___________________________

---

### Test C2: NHIA Payroll Deduction Base
* **Scenario Tested:** A payroll calculation for an employee earning ₦5,000,000 gross. Total basic salary represents 30% (₦1.5M).
* **Observed Result:** The NHIA deduction calculated is exactly `₦26,250` annually. The code enforces an exact `1.75%` rate against the `Basic Salary`, subtracted *before* assessing PAYE taxable income bands.
* **Expected Statutory Interpretation:** Ensure NHIA is strictly 1.75% and applied to basic salary, not gross.
* **Decision:** `[ ] Accept    [ ] Reject    [ ] Needs Revision`
* **Reviewer Name:** ___________________________
* **Signature/Date:** ___________________________

---

### Test C3: Global PIT Aggregation (Foreign + Domestic)
* **Scenario Tested:** User has ₦4,000,000 in domestic income plus $5,000 USD of foreign income (converted @ ₦1,500 = ₦7,500,000). Total worldwide income: ₦11,500,000.
* **Observed Result:** The FX amount is summed with domestic. The progressive NTA 2025 bands are applied *once* to the ₦11.5M total (Total Tax = ₦1.86M). The domestic tax (₦510k) is subtracted to yield the marginal foreign liability (₦1.35M). The distinct double-exemption for the 0% band is eliminated.
* **Expected Statutory Interpretation:** Ensure aggregation strictly prevents claiming the ₦800k basic exemption twice across different income sources.
* **Decision:** `[ ] Accept    [ ] Reject    [ ] Needs Revision`
* **Reviewer Name:** ___________________________
* **Signature/Date:** ___________________________

---

### Test C4: Pure Statutory Deadline Verification
* **Scenario Tested:** Code evaluation of compliance deadlines for standard filings.
* **Observed Result:** The system utilizes rigid calendar strings: VAT due strictly on the `21st of following month`, PAYE due loosely on the `10th of following month`, and CIT due `6 months after year-end`. Variable "+30 days" logic is absent.
* **Expected Statutory Interpretation:** Confirm dates universally apply to standard corporate calendars.
* **Decision:** `[ ] Accept    [ ] Reject    [ ] Needs Revision`
* **Reviewer Name:** ___________________________
* **Signature/Date:** ___________________________
