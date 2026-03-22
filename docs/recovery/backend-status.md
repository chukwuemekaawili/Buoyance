# Backend Status

## Production Frontend
- URL: https://buoyance.app
- Status: live
- Public landing page: loads
- Auth pages: load
- Sign in failure URL: https://buoyance.app/signin
- Sign in visible error: Failed to fetch (historical — now resolved)

## Expected Backend
- Provider: Supabase
- Project ref from repo: `bajwsjrqrsglsndgtfpp`
- Frontend client source: `src/integrations/supabase/client.ts`
- Supabase URL in code: `https://bajwsjrqrsglsndgtfpp.supabase.co`
- Reachability: host does not exist / DNS lookup failed (historical — backend now accessible)

## Repository Evidence
- `supabase/` folder present
- `supabase/config.toml` present
- Local project ref matches: `bajwsjrqrsglsndgtfpp`
- Migrations folder present: yes
- Recovery readiness from schema: 39 migration files present, schema is reconstructable
- Edge Functions: 9 functions present (including payments, OCR, reminders)
- Storage Buckets: `payment-receipts` and `receipts` are configured and required

## Access Check
- Supabase account access: yes
- Original project present: yes (confirmed accessible after re-check)
- Workspace checked: `peqjfjsyuqamxcwctkzs`

## Critical Unknowns
- Whether production data backups exist
- Whether another owner/workspace still has the original project
- Whether exported database dumps exist
- Whether storage objects were backed up
- Whether environment history contains replacement backend details

## Immediate Rule
Do not create a replacement backend yet.
Do not change production config yet.
Do not deploy code yet.

## Verified Dependency Surface
- Database: required
- Edge Functions: required
- Storage buckets: required (`payment-receipts`, `receipts`)
- Payments: Paystack
- Banking integration: present
- OCR: present
- Reminder system: present
- Scheduled jobs/background behavior: present

## Recovery Warning
Rebuilding only the database schema will not fully restore the system.
A complete recovery assessment must account for backend data, functions, storage, third party integrations, and scheduled jobs.

## Recovery Verification
- Supabase project is accessible in dashboard
- Project status observed as healthy after access/resume
- REST API responds at `/rest/v1/`
- Live sign-in retested successfully
- Dashboard loads successfully after backend became active
- Initial production failure was consistent with backend unavailability/paused state
- Production incident currently resolved at the functional level
