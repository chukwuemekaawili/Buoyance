# Buoyance Live Smoke Checklist

Use this checklist after the latest frontend deploy has finished and the live Supabase functions are available.

## 1. Public Surface
- Open `https://buoyance.app`
- Confirm the landing page loads without a blank screen or layout breakage
- Confirm the main CTA buttons render and navigate correctly
- Open `/signin`
- Open `/signup`
- Open `/health`

## 2. Auth Flow
- Sign in with a real test account
- Confirm the app redirects into the authenticated shell cleanly
- Refresh the browser and confirm the session persists
- Sign out and confirm protected pages redirect back to `/signin`

## 3. Health Route
- Visit `/health` while signed out
- Confirm:
  - frontend build configuration shows as present
  - Supabase auth reachability shows as reachable
  - browser session shows no active session
  - authenticated integration probe is skipped
- Sign in and revisit `/health`
- Confirm the authenticated integration probe succeeds

## 4. AI Chat Hardening
- Open the AI chat widget while signed out
- Confirm the UI blocks usage and asks the user to sign in
- Sign in and open the widget again
- Send a normal AI question
- Confirm the response succeeds
- Confirm no anonymous request path remains

## 5. Receipt OCR Hardening
- Open the receipt scan flow in an authenticated workspace
- Upload a valid receipt image
- Confirm OCR extraction succeeds
- Confirm the AI tax-treatment note appears when quota allows
- Confirm the flow fails gracefully when no workspace is active

## 6. Quota Enforcement
- Use a workspace near its AI explanation limit
- Confirm AI chat blocks cleanly when the workspace limit is exceeded
- Use a workspace near its OCR limit
- Confirm receipt OCR blocks cleanly when the workspace limit is exceeded

## 7. Core Product Flows
- Create or open a filing draft
- Open a saved calculation
- Visit the dashboard
- Visit incomes and expenses
- Open archived items
- Confirm there are no console/runtime errors in the main authenticated shell

## 8. Deferred Integrations
- Do not treat these as launch-complete until resumed:
  - Paystack live verification
  - Mono live banking verification
- When resumed, verify:
  - secrets are present
  - the function returns the expected success state
  - failure states are user-safe and clear

## 9. Exit Criteria
- Auth works end to end on the latest deploy
- `/health` reflects the expected environment state
- AI chat and OCR succeed only for authenticated workspace flows
- quota exhaustion behavior is user-safe
- no critical console/runtime errors appear on core pages
