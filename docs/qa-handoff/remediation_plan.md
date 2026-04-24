# Buoyance Tax Product: Remediation and Launch-Readiness Plan

## 1. Evidence Boundaries
- **Evidence Based On**: The comprehensive pre-launch review of the available source code, documented production findings, routing, frontend logic, selected integrations, and calculator behavior.
- **Actually Reviewed**: Frontend React components, client-side TypeScript logic, app routing, UI/UX flows, copy, localized tax math in calculators, integrations (DigiTax, TCC, Payroll), auth flows, onboarding sequences, and dashboard logic.
- **Not Reviewed**: Underlying FIRS/SIRS government APIs, external banking APIs, or payment gateway transaction processing internals.
- **Cannot Conclude Confidently**: True reliability of document generation engines under load, full database persistence for mocked endpoints, and backend deploy safety configurations.
- **Confidence Level**: Medium to High for code-backed frontend and calculator findings; Medium overall for launch readiness due to missing backend, payment, output-generation, and production-runtime verification.

## 2. Accuracy and Anti-Hallucination Rules
Before launch, the product must strictly adhere to the following rules:
- No unsupported tax guidance.
- No AI output treated as authoritative unless backed by deterministic, auditable logic.
- No tax calculations based on scattered constants or conflicting rule sources.
- No placeholder, mock, fake-success, or simulated production flows visible to users at launch.
- No trust badges, compliance claims, or marketing claims without verification.
- No user-entered tax-critical data silently discarded.
- No dashboards, health scores, or recommendations based on hardcoded nulls, placeholders, or mocked assumptions.
- No output that appears final if it is only advisory, estimated, incomplete, or simulated.

## 3. Master Remediation Plan

### A. Immediate Launch Blockers

**1. Dead Production Backend / Auth Failure**
- **Title**: Auth Failure and Dead Production Backend
- **Issue Status**: Likely issue (based on prior notes, requires runtime re-validation)
- **Affected Area**: Sign Up / Sign In / Database connection
- **Why it is a blocker**: Users encounter dead ends or fail to authenticate, preventing any product usage.
- **Exact Problem**: Supabase auth/backend endpoints are flagged as failing or returning dead states in the production setup.
- **Exact Required Fix**: Restore the backend environment, verify Supabase environment variables, and ensure the DB is reachable.
- **Fix Type**: Infra
- **Dependencies**: Supabase configuration and DNS routing.
- **How to verify the fix**: Complete a full signup, sign-in, and database write operation successfully in the production environment.
- **Launch Gate**: Gate 1

**2. Tax Clearance Certificate (TCC) Mock Upload Flow**
- **Title**: TCC Mock Uploads
- **Issue Status**: Confirmed issue (directly visible in code)
- **Affected Area**: TCC Readiness workflow (`TaxClearance.tsx`)
- **Why it is a blocker**: Simulating a government/payment receipt upload with a mock ID ruins trust and breaks the actual compliance pipeline.
- **Exact Problem**: `handleUploadRemita` ignores the selected file and arbitrarily assigns a mock string (`RMR-${Math.random()}`).
- **Exact Required Fix**: Implement a real file upload function to securely store the Remita receipt in the backend bucket and capture the resulting real URL.
- **Fix Type**: Code / Infra
- **Dependencies**: Secure cloud storage bucket configuration.
- **How to verify the fix**: Upload a valid test receipt; confirm it lands in the secure storage bucket and the DB row updates with the real URL.
- **Launch Gate**: Gate 2

**3. TCC Readiness Not Persisted**
- **Title**: Data Loss in TCC Readiness
- **Issue Status**: Confirmed issue (directly visible in code)
- **Affected Area**: TCC Readiness Workspace
- **Why it is a blocker**: Users lose all tracking data if the app refreshes, completely undermining the purpose of the readiness tracker.
- **Exact Problem**: TCC readiness state changes are maintained only in local component state.
- **Exact Required Fix**: Write readiness state changes to the Supabase backend in real-time.
- **Fix Type**: Code / Schema
- **Dependencies**: Database schema for TCC Readiness table.
- **How to verify the fix**: Refresh the page; ensure checked tasks and readiness status persist.
- **Launch Gate**: Gate 2

**4. Stub Foreign Exchange Rates**
- **Title**: Stub Exchange Rates in Foreign Income
- **Issue Status**: Confirmed issue (directly visible in code)
- **Affected Area**: Foreign Income Tax Calculator
- **Why it is a blocker**: Hardcoded exchange rates guarantee inaccurate tax assessments for foreign-earned income in NGN.
- **Exact Problem**: A global constant `STUB_EXCHANGE_RATES` is actively used for all NGN conversions.
- **Exact Required Fix**: Replace the hardcoded stubs with a live exchange rate API integration or a verified, daily-updated database lookup.
- **Fix Type**: Code
- **Dependencies**: Integration with a trusted financial/FX API.
- **How to verify the fix**: Supply foreign income in the calculator and assert the NGN conversion utilizes the day's real-world rate.
- **Launch Gate**: Gate 2

**5. Foreign Income PIT Bands Applied in Isolation**
- **Title**: Disconnected Progressive PIT Bands for Foreign Income
- **Issue Status**: Confirmed issue (directly visible in code)
- **Affected Area**: Foreign Income Tax Calculator
- **Why it is a blocker**: Calculating the progressive tax bands in isolation guarantees massive under-calculation of total user tax liability when they possess multiple income streams.
- **Exact Problem**: The component evaluates progressive tax bands solely on the foreign income chunk rather than globally.
- **Exact Required Fix**: Refactor computation. The foreign income calculator should solely convert currencies and compute valid foreign tax credits, passing the gross NGN amounts to be aggregated into a single, centralized global PIT calculator.
- **Fix Type**: Code
- **Dependencies**: Centralized global PIT calculator.
- **How to verify the fix**: Enter domestic income and foreign income; verify the progressive bands are applied exactly once to the consolidated sum.
- **Launch Gate**: Gate 2

### B. Critical Tax Accuracy Fixes

**1. PIT Band Inconsistency Across Product**
- **Affected workflow or calculator**: Payroll, Crypto, Foreign Income, and Guidance Files
- **Issue Status**: Confirmed issue
- **Current Problem**: Different PIT bands, constants, and logic are scattered across separate calculation files.
- **Real-world risk**: Contradictory tax outputs leading to legal non-compliance and extreme user confusion.
- **Exact Correction Required**: Extract all tax bands into a single source of truth library that every calculator imports.
- **Requires Legal/Tax Validation**: Yes
- **How to verify it**: Run cross-calculator consistency tests evaluating the same gross income and expect identical tax outputs.

**2. Rent Relief Logic Issue**
- **Affected workflow or calculator**: PIT Calculators
- **Issue Status**: Confirmed issue
- **Current Problem**: Rent relief caps/calculations are operating on flawed logic.
- **Real-world risk**: Overstating or understating allowable deductions, altering final tax liability.
- **Exact Correction Required**: Rewrite rent relief logic to strictly observe NTA 2025 deduction limitations.
- **Requires Legal/Tax Validation**: Yes
- **How to verify it**: Execute mathematical golden test cases with known expected outputs for rent relief.

**3. NHIA Payroll Deduction Issue**
- **Affected workflow or calculator**: Payroll Calculator
- **Issue Status**: Confirmed issue
- **Current Problem**: NHIA deductions are improperly calculated or omitted.
- **Real-world risk**: Direct non-compliance with statutory payroll deductions.
- **Exact Correction Required**: Apply correct NHIA percentage and base deduction rules before applying PAYE tax bands.
- **Requires Legal/Tax Validation**: Yes
- **How to verify it**: Payroll deduction tests matching verified statutory payslip examples.

**4. Generic Deadline Logic (+30 days)**
- **Affected workflow or calculator**: Compliance Calendar / Filings
- **Issue Status**: Confirmed issue
- **Current Problem**: Compliance deadlines rely on a generic `+30 days` math instead of legally defined statutory deadlines (e.g., 21st of the following month for VAT).
- **Real-world risk**: Users miss definitive filing deadlines, incurring FIRS/SIRS penalties.
- **Exact Correction Required**: Implement precise statutory calendar logic tied directly to the specific tax type parameter.
- **Requires Legal/Tax Validation**: Yes
- **How to verify it**: Execute deadline rule tests asserting correct respective dates for VAT, PAYE, CIT, etc.

### C. Core Product Integrity Fixes

**1. TIN Identity Data Chain Is Broken**
- **Issue**: TIN is collected during onboarding but not persisted; dashboard tax health uses hardcoded null instead of a persisted TIN.
- **Impact**: Downstream compliance logic depending on TIN cannot be trusted until collection, storage, retrieval, and usage are all verified end-to-end.
- **Fix Required**: Fix the entire data chain: collect TIN, persist TIN, read TIN, and use TIN dynamically in tax health profiles and downstream filings.
- **Dependencies**: Database schema must accept the TIN field.
- **Verification Method**: End-to-end test confirming a unique TIN enters via onboarding and successfully reads back correctly in the dashboard and filing flows.

**2. Fake DigiTax Sync with False Success State**
- **Issue**: The DigiTax integration is a mocked UI that fires a false success toast without performing any backend data synchronization.
- **Impact**: Simulated actions are deceptive, legally risky for a tax product, and violate core product integrity rules.
- **Fix Required**: Remove, disable, or hide the DigiTax sync button completely until a real, verifiable API integration exists.
- **Dependencies**: External API completion.
- **Verification Method**: Ensure pressing 'Sync' does not display a success toast unless network payload proves successful backend transmission.

**3. AI Classification Must Not Auto-Commit Tax Status**
- **Issue**: AI classification auto-categorization overrides the tax status of an item without human gating.
- **Impact**: Exposing users to hidden tax liability risks due to LLM hallucinations directly infecting the user's financial state.
- **Fix Required**: AI suggestions must remain strictly advisory; no direct override of the taxable/exempt state without explicit user confirmation.
- **Dependencies**: None.
- **Verification Method**: Ambiguous items should not alter the final tax state unless the user clicks to accept the suggestion.

**4. Generated Output / Filing Pack Verification Gap**
- **Issue**: `getFilingDocumentUrl` functionality is untested; the integrity of generated PDFs/Excel files is an evidence gap.
- **Impact**: The "Self-File Pack" may be completely blank or mathematically corrupted upon download.
- **Fix Required**: Ensure the server-side document generation function mathematically reconciles exactly with the client-side calculations.
- **Dependencies**: Backend PDF/Excel generator API.
- **Verification Method**: Generated output filings must perfectly match source calculations.

**5. Duplicate Route / Structural Logic Issues**
- **Issue**: Duplicate or conflicting routes within `App.tsx` handling nested paths irregularly.
- **Impact**: Errant redirects, empty screens, or state resets.
- **Fix Required**: Clean up the React Router DOM hierarchy to ensure single, deterministic routes for all pages.
- **Dependencies**: None.
- **Verification Method**: End-to-end routing QA.

**6. Onboarding Redirect Issue**
- **Issue**: Users get stuck in an onboarding loop or misrouted upon signup completion.
- **Impact**: Extremely poor first experience; inability to access the dashboard.
- **Fix Required**: Ensure the `onboarding_completed` flag accurately triggers the intended SPA redirect.
- **Dependencies**: None.
- **Verification Method**: Sign up a new test account and verify smooth routing to Dashboard.

### D. Trust, UX, and Misleading Experience Fixes

**1. Misleading Trust Claims and Unsupported Badges**
- **Issue**: Unauthorized or unexplained compliance badges (e.g., "most trusted").
- **Why it damages trust**: Extravagant, unsubstantiated claims erode credibility among professional accountants and corporate users.
- **Exact Action Required Before Launch**: Strip out all generic superlatives and any compliance badge not explicitly audited and verified by legal/security.

**2. Weak AI Disclaimer Visibility**
- **Issue**: AI categorization outputs lack forceful disclaimers regarding their advisory-only nature.
- **Why it damages trust**: Promotes false confidence, potentially causing users to misclassify income.
- **Exact Action Required Before Launch**: Overlay bold, undisputable disclaimers warning users that AI outputs are advisory and not legal tax determinations.

**3. Pricing & Feature Gating Inconsistencies**
- **Issue**: Pro upgrade parameters are confusing; gating logic allows access to premium tools without payment, or irregularly blocks them.
- **Why it damages trust**: Frustrating experience that makes billing workflows seem broken or arbitrary.
- **Exact Action Required Before Launch**: Standardize the feature flagging mechanism and enforce accurate paywall rules.

**4. Payroll Currency Label Issue**
- **Issue**: Payroll tools employ inconsistent or missing currency labels.
- **Why it damages trust**: Implies lack of attention to financial detail.
- **Exact Action Required Before Launch**: Globally enforce the NGN (₦) label formatting consistently across all payroll views.

### E. Infrastructure, Deployment, and Reliability Fixes

**1. Staging vs. Production and Deploy Safety**
- **Issue**: Deploy environments lack safe separation; staging environments do not mirror production data constraints.
- **Operational risk**: Merging broken tax logic or auth configurations directly to live servers.
- **Exact Corrective Action**: Enforce strict CI/CD deploy gates requiring staging QA sign-off prior to production deployment.
- **Required Verification**: Staging mirrors production sufficiently for verification.

**2. Data Integrity and Monitoring Verification**
- **Issue**: Insufficient database monitoring and point-in-time recovery constraints.
- **Operational risk**: Silent data corruption or total loss of user tax histories.
- **Exact Corrective Action**: Ensure proper DB row-level security, constraints, and daily automated backups are activated on the backend.
- **Required Verification**: Database configuration review.

### F. Deferred / Post-Launch Items

**1. Full Auto-File API Integration**
- **Issue**: "Auto-File Service" for direct government submission is incomplete.
- **Why it is not a launch blocker**: The core "Self-File Pack" allows users to maintain compliance manually.
- **Conditions for deferral**: All "Auto-File" UI components must be completely hidden.
- **When it should be addressed**: Phase 2 Post-launch.

## 4. Remove / Disable / Hide Before Launch
Action the following items prior to passing public traffic:
- **Hide until ready**: Fake DigiTax sync feature and false success states.
- **Hide until ready**: "Auto-File Service" dashboard clutter and "Coming Soon" teasers.
- **Disable at launch**: Mocked TCC upload flow (must use real upload or be hidden entirely).
- **Disable at launch**: Misleading, unsupported compliance badges or arbitrary "most trusted" claims.
- **Keep and fix before launch**: Foreign Income PIT logic and Stub exchange rates.

## 5. Single Source of Truth Requirements
The product architecture MUST be refactored to centralize the following:
- Tax bands
- Deduction rules
- Relief caps
- Payroll deduction rules
- Exchange-rate logic
- Filing deadlines
- Law-version labels
- Compliance rules

**Mandates**:
- No tax constants should remain scattered across files.
- No calculator should maintain its own conflicting tax rules.
- All user-visible guidance must match the exact same underlying rule source.

## 6. Required Verification and Test Plan

### A. Tax Logic Verification
- [ ] Unit tests for each calculator based on the single source of truth rules.
- [ ] Golden test cases with known expected outputs.
- [ ] Cross-calculator consistency tests.
- [ ] Law-version validation checks.
- [ ] Deadline rule tests for specific tax types (CIT, VAT, etc.).
- [ ] Deduction and relief tests (including rent relief limits).
- [ ] Payroll deduction tests including correct NHIA logic.
- [ ] Edge case tests.

### B. Data Integrity Verification
- [ ] Onboarding successfully saves all collected fields (including TIN) to the DB.
- [ ] Dashboard dynamically reads persisted real DB values, removing hardcoded nulls.
- [ ] Uploads store real files in secure environments.
- [ ] Sync features reconcile real records (no fake UI syncs).
- [ ] Generated outputs (PDFs/Excel packs) match source data flawlessly.
- [ ] Saved calculations read back exactly as displayed during input.

### C. UX and Failure-State Verification
- [ ] Every API call has defined loading, success, empty, and error states.
- [ ] No silent failures upon failed submissions.
- [ ] No false success toasts fired before backend confirmations.
- [ ] No dead-end flows or broken routing.
- [ ] Onboarding redirects are intentional and reliable.
- [ ] Form labels and payroll currency labels are unambiguous.
- [ ] Disclaimers are highly visible where advisory AI outputs appear.

### D. Infrastructure Verification
- [ ] Auth works continuously in production.
- [ ] Backend endpoints resolve properly.
- [ ] Environment variables are properly configured across all environments.
- [ ] Storage buckets are configured securely for uploads.
- [ ] Webhooks and callbacks function properly under load.
- [ ] Monitoring and alerts are enabled.
- [ ] Production health checks exist.
- [ ] Staging cleanly mirrors production sufficiently for safe verification.

### E. Security and Compliance Verification
*Note: If backend access is limited, requires dedicated security review.*
- [ ] Access control verification implemented.
- [ ] Row-level data protection verification confirmed on all PII tables.
- [ ] Upload protection verification applied to receipt endpoints.
- [ ] Audit logging configured for critical write/delete actions.
- [ ] Robust session/token handling verification.

## 7. Launch Gate Framework

### Gate 1: Must be fixed before internal testing
- **Issues to Resolve**: Dead production backend/auth failure; Single Source of Truth implementation; Onboarding redirect fixes.
- **Why they belong there**: If the app cannot accept logins, persist a user profile properly without endless loops, or calculate math consistently, internal QA testing is fundamentally impossible.
- **Evidence Required**: Successful backend ping; successful E2E login/onboarding navigation test; PR merged implementing centralized global tax bands.

### Gate 2: Must be fixed before beta
- **Issues to Resolve**: Stub Exchange Rates; Isolated PIT Bands; Rent relief logic; NHIA payroll logic; Generic deadline fixes; Full TIN Identity Data Chain fixes; TCC mock upload flow; TCC Readiness persistence; Fake DigiTax sync removal/fix.
- **Why they belong there**: Beta testers evaluating a tax product will immediately identify fake uploads, broken dates, missing data, and math inconsistencies, destroying product credibility.
- **Evidence Required**: Golden test suite passing for all logic fixes; active database commits for readiness and profile TIN inputs; functional receipt upload utilizing cloud storage. If filing packs (PDFs/Excel exports) are exposed to users, sample outputs MUST be verified against source calculations before this gate opens.

### Gate 3: Must be fixed before public launch
- **Issues to Resolve**: Hiding "Coming Soon" features; AI categorization override protections; Pro purchase and activation path.
- **Why they belong there**: These involve brand trust, polish, and final-mile legal risk distancing.
- **Evidence Required**: Visual QA confirmation comparing production staging against the "Hide Before Launch" manifest. Either a verified working payment + billing activation for Pro features, or premium CTAs and locked-feature messaging must be adjusted so the product does not imply purchasable functionality that is unavailable.

## 8. Missing Evidence and Required Follow-Up
The following evidence remains outstanding to achieve absolute launch confidence:
- **Payment flow evidence**: Real validation of Stripe/Paystack checkout processing and webhook callbacks.
- **Backend schema confirmation**: Review of proper RLS definitions and database constraints on PII.
- **Generated PDFs/Excel outputs**: Sample artifacts proving `getFilingDocumentUrl` functions flawlessly in production.
- **Deployment verification**: Evidence of proper CI/CD guardrails isolating production.
- **Unreviewed files**: Extensive backend functions (e.g. Supabase Edge Functions), remaining calculators, and deeper admin-level management components.

## 9. Executive Summary
- **Top Launch Blockers**: Pending live browser verification on the latest deployment; mock TCC upload capabilities; stubbed foreign exchange rates; and mathematically broken, isolated progressive PIT tax computations.
- **Top Tax Accuracy Risks**: Flawed NHIA deductions; broken rent relief calculations; scattered/conflicting tax bands across the codebase; generic rather than statutory compliance deadlines.
- **Top Trust Risks**: "Fake" success states for features like DigiTax sync; unreviewed AI classifications masquerading as fact; fully broken TIN identity tracking.
- **Top Product Integrity Risks**: Unpersisted dashboard readiness tracking; unverified generation of actual PDF filing packs.
- **Top Misleading Experience Risks**: Prominently displayed unsupported "Coming Soon" features; unverified compliance marketing badges.
- **What Must Be Fixed First**: Live auth and dashboard verification on the updated deployment, the broken TIN data chain, and the centralization of all tax logic into a single verified source of truth.
- **What Must Be Hidden Or Disabled Before Launch**: The fake DigiTax sync, the Auto-File Service UI components, the faux TCC `Math.random()` upload (if not cleanly rewritten), and unsupported marketing/trust badges.
- **Overall Launch Recommendation**: **DO NOT LAUNCH FULLY YET**. Immediate focus should be on completing live browser QA on the updated deployment, then proceeding to a narrow beta only after core routing, auth, data persistence, and centralized math logic are thoroughly validated.
