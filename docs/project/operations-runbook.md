# Operations Runbook

## Purpose
This document tracks the minimum production operations setup Buoyance should have before a confident public launch.

## Current Production Surfaces
- Frontend: DigitalOcean App Platform static site at `https://buoyance.app`
- Backend: Supabase project `bajwsjrqrsglsndgtfpp`
- Repo-managed frontend app spec: `.do/app.yaml`

## Current State
- Active Supabase project is reachable
- Frontend app spec declares the Supabase frontend build variables
- `/health` route exists in the app for live browser verification
- `ai-chat` and `ocr-extract` require JWT at the Supabase gateway
- `PAYSTACK_SECRET_KEY` and `MONO_SECRET_KEY` are intentionally pending

## Still Required Before Broad Launch

### Monitoring
- Add an uptime check for:
  - `https://buoyance.app`
  - `https://bajwsjrqrsglsndgtfpp.supabase.co/rest/v1/`
- Route alerts to a real owner
- Define what “page someone immediately” means

### Ownership
- Record the owner for:
  - Supabase project
  - DigitalOcean app
  - GitHub production branch protections
  - domain / DNS
- Record who can rotate secrets and who can deploy

### Backups
- Confirm whether Supabase backups are enabled
- Define a manual export cadence if automated backups are insufficient
- Record where backup exports are stored
- Record restore ownership and first-response steps

### Deploy Safety
- Decide whether production should keep deploying directly from `main`
- If not, add a staging environment and a promotion path
- Keep launch-sensitive changes small and reversible

## Suggested Launch-Day Checks
- Open `/health`
- Sign in with a real test account
- Confirm dashboard shell loads
- Confirm AI chat works only while signed in
- Confirm OCR works only while signed in
- Confirm no critical console/runtime errors appear on the main shell

## Deferred Items
- Paystack live secret setup and runtime verification
- Mono live secret setup and runtime verification
- Full browser smoke checklist execution
