# Buoyance Launch Blockers

## Verified Engineering State

- `npm run lint`: PASS
- `npm run build`: PASS
- `npx vitest run`: PASS
- Live Supabase hardening completed:
  - server-side quota migration applied
  - `ai-chat`, `ocr-extract`, `paystack-payment`, and `bank-connect` redeployed
  - `ai-chat` and `ocr-extract` now require JWT at the Supabase gateway
  - `.do/app.yaml` now declares the frontend Supabase build variables
- Build warnings addressed:
  - `xlsx` mixed import warning removed
  - vendor chunking improved in `vite.config.ts`

This means the repository is code-clean locally, but that does **not** by itself make the product launch-ready.

## Recommended Launch Scope

The codebase is best suited for a narrow, honest launch around:

- PIT
- VAT
- CGT
- income and expense tracking
- manual statement import
- filing draft generation / self-file packs
- manual payment logging with evidence
- TCC tracking
- WHT certificate ledger / OCR support where already present

## Hard Blockers

These block an honest claim that the full product is launch-ready.

1. Post-deploy browser verification is still incomplete.
   - Current state:
     - the repo-level frontend config has been corrected
     - the active Supabase project is live
     - live sign-in/sign-up has not yet been re-verified end to end on the latest deployment
   - Launch impact:
     - auth or app-shell regressions can still slip through even though the backend and config work is in place
   - Required before launch:
     - prove sign-in and sign-up work on the live site
     - confirm the post-login shell loads without console/runtime errors
     - confirm the updated frontend is talking to the hardened Supabase functions

2. Manual/browser QA is still incomplete.
   - Key flows not manually verified in a browser:
     - archived restore
     - calculations archive/finalize/export
     - invoicing save flow
     - payments archive flow
     - payroll batch save flow
     - accept invite flow
   - Launch impact:
     - lint/build/tests passing does not guarantee UI behavior is correct
   - Required before launch:
     - run a browser QA checklist on the real app
     - confirm no console/runtime errors on the main flows

3. Live integration validation is still incomplete.
   - Functions needing real environment validation:
     - `supabase/functions/bank-connect/index.ts`
     - `supabase/functions/paystack-payment/index.ts`
     - `supabase/functions/compliance-reminders/index.ts`
     - `supabase/functions/deadline-reminders/index.ts`
   - Launch impact:
     - edge functions may still fail in live deployment even if local code is clean
   - Required before launch:
     - deploy and call each function in the intended environment
     - verify secrets, permissions, expected responses, and failure behavior
   - Note:
     - `MONO_SECRET_KEY` and `PAYSTACK_SECRET_KEY` are intentionally pending for now

## Product Blockers By Feature

These are not hidden code bugs; they are current product limitations that must either be completed or explicitly excluded from launch scope.

1. Auto-file / direct authority submission is not ready.
   - Current gating:
     - `src/pages/Filings.tsx`
     - `src/pages/filings/NewFiling.tsx`
     - `src/lib/nrsFilingService.ts`
   - Current state:
     - surfaced as unavailable / coming soon
   - Launch action:
     - either keep excluded from launch scope
     - or complete real authority submission and verification

2. Online payment is intentionally disabled.
   - Current gating:
     - `src/lib/launchReadiness.ts`
     - `src/lib/paymentGatewayService.ts`
   - Current state:
     - online payment blocked until webhook-backed confirmation is live
   - Launch action:
     - either keep manual payment only
     - or implement webhook-backed payment confirmation and verify it live

3. Live bank connection is not self-serve yet.
   - Current gating:
     - `src/pages/BankConnections.tsx`
   - Current state:
     - UI honestly says manual imports are the supported path
   - Launch action:
     - either launch with manual import only
     - or complete the provider widget / sync onboarding flow

4. Email notifications are not fully real yet.
   - Current state:
     - settings show email as coming soon when not configured
     - email sending adapter is stubbed in `src/lib/notificationService.ts`
   - Launch action:
     - either keep in-app notifications only
     - or ship real outbound email delivery and verify it end to end

5. Two-factor authentication is not implemented.
   - Current gating:
     - `src/pages/Settings.tsx`
   - Current state:
     - shown as coming soon
   - Launch action:
     - either exclude from launch claims
     - or implement and validate it

6. CIT and WHT surfaces remain under review.
   - Current gating:
     - `src/lib/launchReadiness.ts`
     - `src/pages/filings/NewFiling.tsx`
   - Current state:
     - filing drafts for CIT and WHT are blocked in the new filing flow
   - Launch action:
     - either keep them out of launch scope
     - or complete professional/legal review of the assumptions and re-enable

## Go / No-Go Recommendation

## No-Go for a full-platform launch

Reasons:

- core browser QA has not been completed
- live integrations have not been validated end to end
- several headline features remain intentionally disabled

## Go for a narrow beta only if all of the following are true

- production auth is proven live on the updated deployment
- browser QA is completed on key user flows
- launch messaging clearly excludes:
  - auto-file
  - pay online
  - self-serve live bank connection
  - email delivery
  - 2FA
  - CIT/WHT filing guidance currently under review

## Immediate Next Steps

1. Run browser QA on the live auth flow and core user journeys.
2. Decide launch scope explicitly:
   - narrow beta
   - or full launch after the blocked features are completed
3. Resume the pending Paystack/Mono secrets work when you are ready.
4. If full launch is still the goal, prioritize:
   - webhook-backed payment confirmation
   - live bank onboarding
   - real email delivery
   - CIT/WHT review completion
