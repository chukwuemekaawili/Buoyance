# Project Overview

## Name
Buoyance

## Purpose
Buoyance is a comprehensive tax compliance and financial management platform designed for individuals, businesses, and accountants (with features tailored for Nigerian tax systems like CIT, PIT, VAT, WHT, and TCC). End-to-end, it enables users to connect bank accounts, track income and expenses, automate complex tax calculations, generate filings, manage payments, and maintain audit readiness. It solves the problem of manual, error-prone tax management by centralizing financial data and compliance workflows into a single system.

## Current State
* Local: yes
* GitHub: yes
* Deployment: DigitalOcean App Platform
* Live URL: https://buoyance.app
* Active Supabase project: `bajwsjrqrsglsndgtfpp`
* Live browser smoke status: pending post-deploy verification

## Stack
React + TypeScript + Vite + Tailwind + Supabase

## Known Issues
- No PRD
- Production is live
- Auto deploy on main (risk)
- Full browser QA is still pending on the latest deployment
- Paystack and Mono secrets are intentionally pending
- Live auth must still be re-verified end to end after the latest frontend redeploy

## Config Findings
- Supabase client file: `src/integrations/supabase/client.ts`
- Supabase URL is read from `import.meta.env.VITE_SUPABASE_URL`
- Supabase publishable key is read from `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`
- The client file correctly follows the standard Vite environment variable pattern
- Local `.env` contains the required variables, and the client file consumes them correctly
- Frontend config approach is consistent with Vite standards
- `.do/app.yaml` now declares `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for DigitalOcean App Platform builds.
- The active Supabase project `bajwsjrqrsglsndgtfpp` is live and reachable.
- The server-side quota migration has been applied to the live database.
- `ai-chat`, `ocr-extract`, `paystack-payment`, and `bank-connect` have been redeployed to the live project with the reviewed hardening changes.
- `ai-chat` and `ocr-extract` now require a JWT at the Supabase gateway, in addition to their in-function auth checks.
- Paystack and Mono flows still depend on secrets that are intentionally pending.

## Confirmed Live Surface
- App name: buoyance-app
- Production URL: https://buoyance.app
- Status: loads successfully
- Current live surface: public marketing landing page
- Auth entry: present
- Sign in page: loads
- Sign up page: loads
- Latest repo-level frontend config fix has been pushed to `main`
- Latest end-to-end sign-in and sign-up result is not yet re-verified in a browser on the updated deployment

## Next Questions
- Does live sign-in and sign-up succeed on the latest DigitalOcean deployment?
- Do the core authenticated user journeys complete without console or runtime errors?
- When should the pending `MONO_SECRET_KEY` and `PAYSTACK_SECRET_KEY` work resume?
- Do we have a backup of the actual production data (users, filings, settings), or are we proceeding with a fresh, empty database containing only the schema?
