# Deployment Safety: Buoyance

**Status**: LIVE / Deployment-Sensitive

## Safety Principles
- **Live Platform**: This project is deployed at `https://buoyance.app`. Treat it as production-sensitive.
- **Reversibility First**: Prefer small, incremental changes that can be quickly undone if they cause regression.
- **No Broad Refactors**: Avoid codebase-wide changes unless absolutely necessary.
- **Quarantine over Delete**: If a file or piece of logic is no longer needed, rename/move it (e.g., `.bak`) before deleting to ensure recovery.
- **Backup Before Risk**: For risky data or configuration edits, ensure a local backup or snapshot exists.

## Verification Checklist
1. **Local Verification**: Always test the build and local dev server before any push to `main`.
2. **Minimal Smoke Tests (Post-Deploy)**:
   - [ ] Verify landing page loads correctly.
   - [ ] Verify `/signin` and `/signup` routes load (even if underlying service is unstable).
   - [ ] Verify core CTA buttons are functional in UI.
   - [ ] Check browser console for unexpected errors on load.

## Configuration Warnings
- **Secrets/Env**: Do not modify environment variables or DigitalOcean deployment settings casually.
- **Inconsistent Config**: Be aware that `src/integrations/supabase/client.ts` may contain hardcoded URIs; check environment variable usage before patching.
- **Risk Mitigation**: If the risk of a change is unclear, reduce the scope or provide a proof-of-concept first.
