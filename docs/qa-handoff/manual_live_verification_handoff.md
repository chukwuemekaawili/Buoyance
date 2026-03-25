# Buoyance QA: Manual Live Verification Handoff

**Purpose:** This document is the strict, executable test plan required for human QA testers to close the remaining Gate 1 and Gate 2 blockers. Automated verification was blocked by infrastructure constraints (503 timeouts).
**Environment Required:** **MUST** be run on a live deployment (Staging closely matching Production, or Production itself) connected to the true Supabase backend. Localhost testing is insufficient.

---

## Part A: Infrastructure & Auth Readiness (Gate 1)

### Test A1: Full Auth Round-Trip
**Goal:** Confirm Supabase Auth keys are correctly provisioned in the live environment.
1. **Action:** Access the live URL.
2. **Action:** Complete an Email sign-up flow using a test email.
3. **Action:** Log out.
4. **Action:** Complete a Google OAuth sign-up flow using a new account.
- **Expected Result:** Both accounts authenticate successfully. No 401 Unauthorized errors during sign-in.
- **Evidence Required:** Screenshot of the dashboard after login; Screenshot of Supabase `auth.users` showing both rows.
- **Status:** `[ ] PASS   [ ] FAIL`
- **QA Sign-off:** ___________________________

### Test A2: Onboarding Routing Continuity
**Goal:** Prove the infinite redirect loop bug is permanently resolved.
1. **Action:** Ensure user from Test A1 is logged in.
2. **Action:** Fill out the onboarding tax profile and click Complete.
3. **Action:** Close the browser tab entirely.
4. **Action:** Re-open the URL.
- **Expected Result:** The user arrives logged in and is immediately routed to `/dashboard`. They are **never** routed back to `/onboarding`.
- **Evidence Required:** Browser history / Network recording showing the immediate redirect to `/dashboard`.
- **Status:** `[ ] PASS   [ ] FAIL`
- **QA Sign-off:** ___________________________

---

## Part B: Database Persistence & Storage Readiness (Gate 1 & 2)

### Test B1: TIN Identity Round-Trip
**Goal:** Confirm the `profiles` table schema accepts and persists string TIN values.
1. **Action:** Go to `Settings > Profile`.
2. **Action:** Enter a valid Nigerian TIN (e.g., 10 digits) and save.
3. **Action:** Force refresh the browser and go to the main Dashboard.
- **Expected Result:** The `profiles` table in Supabase contains the TIN. The Dashboard Tax Health indicator displays the stored TIN.
- **Evidence Required:** Screenshot of the Dashboard Tax Health widget displaying the saved TIN.
- **Status:** `[ ] PASS   [ ] FAIL`
- **QA Sign-off:** ___________________________

### Test B2: Real TCC Upload
**Goal:** Confirm RLS policies and Storage Buckets are actually provisioned.
1. **Action:** Go to the Tax Clearance (TCC) tool.
2. **Action:** Proceed to the Remita receipt upload step.
3. **Action:** Select a test PDF or image and upload.
- **Expected Result:** A real file is written to the Supabase `receipts` bucket. The DB row (`tcc_requests`) contains a valid `tcc_document_url` and no `RMR-` mock random string.
- **Evidence Required:** Link the live public URL of the uploaded image. Check the DB for the exact row URL.
- **Status:** `[ ] PASS   [ ] FAIL`
- **QA Sign-off:** ___________________________

### Test B3: TCC Readiness Persistence
**Goal:** Prove the newly refactored `tcc_checklist_items` table works in production.
1. **Action:** Go to the TCC Readiness checklist.
2. **Action:** Check off 3 specific compliance tasks.
3. **Action:** Log out and log back in (or hard refresh).
- **Expected Result:** The 3 tasks remain checked.
- **Evidence Required:** Screenshot of the UI matching the rows in Supabase.
- **Status:** `[ ] PASS   [ ] FAIL`
- **QA Sign-off:** ___________________________

### Test B4: Foreign Income FX Live API Check
**Goal:** Confirm the live FX rate API is hooked up and the key is valid.
1. **Action:** Go to the Foreign Income calculator.
2. **Action:** Enter $10,000 USD.
3. **Action:** Observe the NGN conversion rate displayed.
- **Expected Result:** The conversion clearly applies today's live FX rate (e.g., ~$1,500/USD), proving it bypassed the deprecated `STUB_EXCHANGE_RATES`.
- **Evidence Required:** Screenshot of the FX rate displaying in the UI without `(indicative)` stub warnings.
- **Status:** `[ ] PASS   [ ] FAIL`
- **QA Sign-off:** ___________________________

---

## Gate Closure Conditions
*   **Gate 1** can only be closed when Tests A1 and A2 are marked PASS.
*   **Gate 2** can only be closed when Tests B1, B2, B3, and B4 are marked PASS, AND the separate `accountant_signoff_sheet.md` is signed completely.
*   **Launch Readiness:** **NO**. The product is explicitly blocked from launch until these manual verification steps and domain sign-offs are comprehensively achieved.
