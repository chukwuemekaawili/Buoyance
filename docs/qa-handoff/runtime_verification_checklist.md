# Buoyance QA & Domain Expert: Runtime Verification Protocol

**Purpose:** This document is the strict, executable test plan required to definitively close the remaining Gate 1 and Gate 2 remediation items for the NTA 2025 launch.  
**Environment:** **MUST** be run on a live deployment (Staging closing matching Production, or Production itself) connected to the true Supabase backend. Localhost testing is insufficient for closing these items.

---

## Part A: Infrastructure & Auth Readiness (Gate 1)

### Test A1: Full Auth Round-Trip
- **Pre-requisite:** The `.env` file on the deployed host contains the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Test Steps:**
  1. Access the live URL.
  2. Complete an Email sign-up flow.
  3. Log out.
  4. Complete a Google OAuth sign-up flow using a new account.
- **Expected Result:** Both accounts authenticate successfully, and rows appear in the Supabase `auth.users` table. No 401 Unauthorized errors during sign-in.
- **Sign-off:** `[ ] Infra Lead`

### Test A2: Onboarding Routing Continuity
- **Pre-requisite:** User accounts from Test A1 are logged in.
- **Test Steps:**
  1. Fill out the onboarding tax profile.
  2. Click Complete.
  3. Close the browser tab entirely.
  4. Re-open the URL and arrive logged in.
- **Expected Result:** The user is immediately routed to `/dashboard`. They are **never** routed back to `/onboarding`.
- **Sign-off:** `[ ] QA`

---

## Part B: Database Persistence & Storage Readiness (Gate 1 & 2)

### Test B1: TIN Identity Round-Trip
- **Test Steps:**
  1. Go to `Settings > Profile`.
  2. Enter a valid Nigerian TIN (e.g., 10 digits).
  3. Save profile.
  4. Force refresh the browser.
  5. Go to the main Dashboard.
- **Expected Result:** The `profiles` table in Supabase contains the TIN. The Dashboard Tax Health indicator correctly reads and displays the stored TIN instead of `null` or an empty state.
- **Sign-off:** `[ ] QA`

### Test B2: Real TCC Upload
- **Pre-requisite:** Supabase Storage bucket `receipts` exists with RLS policies allowing authenticated uploads.
- **Test Steps:**
  1. Go to the Tax Clearance (TCC) tool.
  2. Proceed to the Remita receipt upload step.
  3. Select a test PDF or image and upload.
- **Expected Result:** A real file is written to the Supabase storage bucket. The `tcc_requests` DB row returns a valid, resolvable URL. The UI successfully previews or links to the uploaded document, and no `RMR-` mock random string is generated.
- **Sign-off:** `[ ] QA`

### Test B3: TCC Readiness Dashboard Persistence
- **Test Steps:**
  1. Go to the TCC Readiness checklist.
  2. Check off 3 specific compliance tasks.
  3. Log out and log back in (or hard refresh).
- **Expected Result:** The 3 tasks remain checked. The `tcc_checklist_items` table in Supabase correctly mapped the state to the user's UUID.
- **Sign-off:** `[ ] QA`

### Test B4: Foreign Income FX Live API Check
- **Pre-requisite:** Production environment variables contain the live FX API key.
- **Test Steps:**
  1. Go to the Foreign Income calculator.
  2. Enter $10,000 USD.
- **Expected Result:** The conversion clearly applies today's live FX rate (e.g., $10K USD = ₦15M+), rather than the old hardcoded 1550 stub. If the API fails or rate limits, the UI must fail gracefully showing an error alert, bypassing silent failures.
- **Sign-off:** `[ ] QA`

---

## Part C: Tax Logic Golden-Value Tests (Gate 1 & 2)

**Mandatory Requirement:** A certified tax accountant or domestic legal counsel must run these tests and confirm the final NGN outputs perfectly match official FIRS methodologies and NTA 2025.

### Test C1: Rent Relief Cap Enforcement
- **Test Steps:** Enter a hypothetical user earning ₦10,000,000 per annum base salary and inputting ₦3,000,000 in rent expense.
- **Expected Result:** The internal calculator correctly limits the rent relief deduction to `MIN(200,000, 1/6 of gross)`. In this scenario, max deduction cannot exceed the statutory cap, despite a 3M expense.
- **Sign-off:** `[ ] Lead Accountant`

### Test C2: NHIA Payroll Deduction Base
- **Test Steps:** Run a payroll calculation for an employee earning ₦5,000,000 gross.
- **Expected Result:** The NHIA deduction amounts to exactly 1.75% of basic salary, and this deduction must be subtracted strictly *before* assessing the PAYE taxable income bands.
- **Sign-off:** `[ ] Lead Accountant`

### Test C3: Global PIT Aggregation (Foreign + Domestic)
- **Test Steps:** In the global calculator, assign a user ₦4,000,000 in domestic self-employed income, plus $5,000 USD of un-remitted foreign income.
- **Expected Result:** The foreign FX amount is summed with the 4M. The progressive NTA 2025 bands configured in the centralized tax engine are applied once to the grand total. The legacy bug of splitting the bands twice (effectively doubling the 0% exemption) is confirmed gone.
- **Sign-off:** `[ ] Lead Accountant`

### Test C4: Pure Statutory Deadline Verification
- **Test Steps:** Generate a mock calendar filing for three tax types: VAT, PAYE, and CIT (for an entity ending its financial year on Dec 31).
- **Expected Result:** 
  - VAT due exactly on the 21st of next month. 
  - PAYE due exactly on the 10th of next month.
  - CIT due exactly 6 months post year-end (June 30).
  (Generic `+30 days` math is nowhere to be seen.)
- **Sign-off:** `[ ] Lead Accountant`

---

## Part D: Cross-Calculator Engine Consistency (Gate 1)

### Test D1: `taxEngine.ts` Single Source Validation
- **Test Steps:** Enter a clean, un-deducted ₦10,000,000 gross income independently into the pure **PIT Calculator** and the **Payroll Calculator**.
- **Expected Result:** The strict baseline tax liability is identical across both tools. The app no longer relies on fragmented hardcoded arrays inside the components.
- **Sign-off:** `[ ] QA`

---
*Once all required tests and sign-offs in this checklist are completed successfully, Gate 1 and Gate 2 may be considered closed, subject to final release review. Launch readiness still requires confirmation that Gate 3 changes are present in the deployed environment and that no regression has been introduced.*
