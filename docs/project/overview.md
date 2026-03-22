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

## Stack
React + TypeScript + Vite + Tailwind + Supabase

## Known Issues
- No PRD
- No documentation
- Production is live
- Auto deploy on main (risk)
- Auth surface appears broken in production
- Sign in page returns: Failed to fetch

## Config Findings
- Supabase client file: `src/integrations/supabase/client.ts`
- Supabase URL is hardcoded in the client file
- Supabase publishable key is hardcoded in the client file
- The client file does not read from `import.meta.env`
- The Supabase client is created directly in that file
- Local `.env` contains Vite-prefixed Supabase variables, but this client file does not use them
- Frontend config approach is inconsistent
- This may explain the production auth failure on `/signin` with `Failed to fetch`
- Hardcoded Supabase URL: `https://bajwsjrqrsglsndgtfpp.supabase.co`
- Verified result: DNS lookup failed / host does not exist
- Current production auth failure is consistent with a dead Supabase backend endpoint
- Local `supabase/migrations` folder has 39 migrations, confirming the backend schema can be fully reconstructed locally or in a new instance.

## Confirmed Live Surface
- App name: buoyance-app
- Production URL: https://buoyance.app
- Status: loads successfully
- Current live surface: public marketing landing page
- Auth entry: present
- Sign in page: loads
- Sign up page: loads
- Verified auth failure URL: https://buoyance.app/signin
- Verified auth failure message: Failed to fetch

## Next Questions
- Was the original Supabase project deleted, renamed, or replaced?
- Is there a new active Supabase project that this app should use?
- Where is the correct production backend configuration supposed to come from?
- Do we have a backup of the actual **production data** (users, filings, settings), or are we proceeding with a fresh, empty database containing only the schema?
