# Infrastructure

## Production Frontend
- Platform: DigitalOcean App Platform
- Component type: Static Site
- Production URL: https://buoyance.app
- Deployment branch: main
- Auto deploy: enabled

## Backend
- Provider: Supabase
- Project ref: bajwsjrqrsglsndgtfpp
- URL source in production: DigitalOcean component environment variables
- URL source in local dev: `.env`

## Frontend Config Rule
- Supabase client must not hardcode URL or keys
- Frontend must read from:
  - `import.meta.env.VITE_SUPABASE_URL`
  - `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`

## Current Safe Workflow
- Do active development on `dev`
- Do not push unfinished work to `main`
- Do not change DigitalOcean branch settings casually
- Verify locally before any production-impacting action
