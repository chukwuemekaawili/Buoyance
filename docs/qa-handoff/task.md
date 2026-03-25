# Buoyance Remediation — Task Tracking

**Status codes:**
- `✅ Code-verified` — confirmed by code inspection; not yet validated in a live environment
- `⚠️ Impl / pending` — code change complete, requires live runtime confirmation
- `❌ Blocked` — not implemented or dependency unresolved
- `⚖️ Requires legal/tax sign-off` — methodology requires verification by domain experts

---

## Gate 1 — Backend, Tax Logic, Onboarding

| Gate | Task | Owner | Status | Verification Required | Evidence | Blocker / Dependency |
|---|---|---|---|---|---|---|
| G1 | Backend / Auth Reliability | Infra | ❌ Blocked / pending manual live execution | Full auth round-trip (signup → sign-in → DB write) in production | `.env.local` vars confirmed present; `post-incident-actions.md` updated | Supabase anon key must be active; DNS routing must resolve |
| G1 | Centralize Tax Logic | Engineering | ✅ Code-verified (PASS) | Cross-calculator golden-value unit tests with known expected outputs | `taxEngine.ts` single source of truth confirmed via node script execution | None |
| G1 | Onboarding Routing Fix | Engineering | ❌ Blocked / pending manual live execution | New account signup → confirm no redirect loop → dashboard loads | Code path inspected; `onboarding_completed` flag logic corrected | Must test both email and Google OAuth signup paths in production |

---

## Gate 2 — Data Integrity, Tax Accuracy, Core Product

| Gate | Task | Owner | Status | Verification Required | Evidence | Blocker / Dependency |
|---|---|---|---|---|---|---|
| G2 | TIN Identity Chain | Engineering | ❌ Blocked / pending manual live execution | Enter TIN in Settings → refresh → confirm TIN persists and appears in dashboard Tax Health | `profiles` upsert code in `Settings.tsx` and `Onboarding.tsx` inspected | `tin` column must exist in `profiles` schema; migration must be applied |
| G2 | Foreign Income FX Rates | Engineering | ❌ Blocked / pending manual live execution | Run calculator with foreign income → confirm NGN uses live day-rate, not stub | `STUB_EXCHANGE_RATES` removed; live API call wired in `foreignIncomeTaxCalculator.ts` | FX API key must be provisioned in env; API must be reachable from production host |
| G2 | Foreign Income PIT Aggregation | Engineering | ✅ Code-verified (Pending Sign-off) | Enter domestic + foreign income → verify single progressive band applies to combined total | Code refactored to pass aggregated NGN income to `taxEngine.ts`. Tested successfully via script. | ⚖️ Depends on taxes law validation of aggregation method |
| G2 | Rent Relief Logic | Engineering | ✅ Code-verified (Pending Sign-off) | Golden-value test: known salary + rent → correct deduction cap applies | NTA 2025 cap implemented in `taxEngine.ts`. Tested successfully via script. | ⚖️ Requires legal/tax sign-off on cap formula |
| G2 | NHIA Payroll Deduction | Engineering | ✅ Code-verified (Pending Sign-off) | Payroll test: known salary → NHIA deducted at 1.75% before PAYE bands | Implementation in `taxEngine.ts` and `Payroll.tsx` updated and tested successfully. | ⚖️ Requires legal/tax sign-off on rate and base |
| G2 | Compliance Deadline Logic | Engineering | ✅ Code-verified (Pending Sign-off) | Deadline rule tests for VAT (21st), PAYE (10th), CIT (6 months) with correct dates | Per-type statutory logic implemented in `taxEngine.ts`. Tested successfully via script. | ⚖️ Must validate against FIRS official calendar for 2025 |
| G2 | Real TCC Upload | Engineering | ❌ Blocked / pending manual live execution | Upload test receipt → confirm file appears in Supabase bucket and DB row has real URL | Mock `RMR-${Math.random()}` removed; Supabase Storage call present | Bucket must be provisioned; RLS policies must permit authenticated write |
| G2 | TCC Readiness Persistence | Engineering | ❌ Blocked / pending manual live execution | Check box → refresh page → confirm box remains checked from DB | Supabase write-on-toggle implemented; mount load from `tcc_readiness` table | `tcc_readiness` table must exist; migration must be confirmed applied |
| G2 | DigiTax Fake Sync Removal | Engineering | ✅ Code-verified | None — deferred to Phase 2 | Grep: no `handleMbsSync` or success toast in `DigiTax.tsx`; Coming Soon UI renders | None |
| G2 | AI Classification Confirmation | Engineering | ✅ Code-verified | None outstanding for launch | `setTaxExempt` auto-assignment removed; accept/reject confirmation UI present in `Incomes.tsx` | None |

---

## Gate 3 — Trust, UX, Consistency, Routing

| Gate | Task | Owner | Status | Verification Required | Evidence | Blocker / Dependency |
|---|---|---|---|---|---|---|
| G3 | Misleading Trust Claims | Engineering | ✅ Code-verified | Manual copy review of Blog, About, Pricing pages (not yet done) | Grep: `"Bank-grade"` = 0 results; `"NRS Compliant"` = 0 results in `src/` | Recommend a full marketing copy audit before launch |
| G3 | AI Limitation Disclaimers | Engineering | ✅ Code-verified | Accessibility check (screen reader) recommended but not blocking | Disclaimer element confirmed in JSX in all 4 LLM components; renders unconditionally | None |
| G3 | Feature Gating / Pricing UI | Engineering | ✅ Code-verified | Gate bypass test: confirm free-tier user cannot access Pro URLs directly | The UI consistency fix is complete `<Lock>` → `<Diamond>`. | Underlying plan enforcement / paywall logic was NOT validated in this pass. Direct URL bypass / free-tier access still requires verification. |
| G3 | Currency Consistency (NGN → ₦) | Engineering | ✅ Code-verified | None outstanding | Grep confirms no user-facing `"NGN"` label strings remain (ISO code in Excel export intentionally retained) | None |
| G3 | Redundant Routing Cleanup | Engineering | ✅ Code-verified | None outstanding | Grep for `path="/settings"` in `App.tsx` = 1 result (L166 canonical) | None |

---

## Executive Summary & Launch Readiness

- **Gate 3 code changes are complete.**
- **Gate 1 and Gate 2 still contain multiple items pending runtime verification, infrastructure readiness, and legal/tax sign-off.**
- **The product is not ready for launch until those are closed.**
