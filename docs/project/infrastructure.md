# Infrastructure

## Production Frontend
- Platform: DigitalOcean App Platform
- Component type: Static Site
- Production URL: https://buoyance.app
- Deployment branch: main
- Auto deploy: enabled
- App spec source: `.do/app.yaml`

## Backend
- Provider: Supabase
- Project ref: bajwsjrqrsglsndgtfpp
- Project URL: https://bajwsjrqrsglsndgtfpp.supabase.co
- URL source in production: `.do/app.yaml` build-time envs plus DigitalOcean component environment variables
- URL source in local dev: `.env`
- Edge functions in active launch scope:
  - `ai-chat`
  - `ocr-extract`
  - `paystack-payment`
  - `bank-connect`
- Pending secrets intentionally deferred:
  - `PAYSTACK_SECRET_KEY`
  - `MONO_SECRET_KEY`

## Frontend Config Rule
- Supabase client must not hardcode URL or keys
- Frontend must read from:
  - `import.meta.env.VITE_SUPABASE_URL`
  - `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`
- The repo app spec should declare the production build-time values used by DigitalOcean

## Current Safe Workflow
- Do active development on `dev`
- Do not push unfinished work to `main`
- Do not change DigitalOcean branch settings casually
- Verify locally before any production-impacting action
- Run live browser QA after any production-impacting frontend or auth change

## Related Runbooks
- Launch/ops checklist: `docs/project/operations-runbook.md`
- Live browser validation: `docs/qa-handoff/live-smoke-checklist.md`
