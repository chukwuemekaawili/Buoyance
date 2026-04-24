# Post-Incident Actions

## 1. Root Cause
- Supabase project was paused (or unavailable)
- Frontend was still deployed and attempting to connect
- Result: "Failed to fetch" across auth and data requests

## 2. Why This Was Dangerous
- No monitoring or alerting in place
- No clear ownership of backend lifecycle
- No documented recovery procedure
- Production appeared "live" but was partially dead

## 3. Immediate Fixes (Required)

### A. Add Monitoring
- Set up uptime check for:
  - https://bajwsjrqrsglsndgtfpp.supabase.co/rest/v1/
- Set up alert if response fails
- Status: still pending

### B. Document Critical Infrastructure
Create `docs/project/infrastructure.md` with:
- Supabase project ID
- Supabase URL
- Where env vars are stored (DigitalOcean)
- Deployment flow (main → auto deploy)
- Status: completed

### C. Remove Hidden Coupling
- Stop hardcoding Supabase keys in code
- Move fully to environment variables
- Ensure frontend reads from `import.meta.env`
- Status: partially completed
  - frontend reads from `import.meta.env`
  - `.do/app.yaml` now declares the production Supabase frontend build vars
  - continue avoiding any new hardcoded production values outside controlled config files

### D. Add Health Check Page
- Add `/health` route in frontend
- Should verify:
  - Supabase reachable
  - Auth session valid
- Status: completed in repo; requires live browser verification on latest deploy

## 4. Near-Term Improvements

### A. Environment Separation
- Create `staging` environment
- Stop deploying directly from `main`

### B. Backup Strategy
- Enable Supabase backups (if plan allows)
- Add manual export process (weekly minimum)
- Status: still pending

### C. Access Control
- Identify who owns:
  - Supabase project
  - DigitalOcean app
- Remove ambiguity
- Status: still pending

## 5. Non-Negotiables Going Forward
- No production system without monitoring
- No backend without backup strategy
- No environment variables hidden or mismatched
- No "unknown" answers for production state

## 6. Current Status
- Backend: active
- Frontend: working
- Auth: backend/config hardening complete, latest browser verification still pending
- Data: unknown integrity
