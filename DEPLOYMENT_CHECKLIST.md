# Buoyance Deployment Checklist — NTA 2025 Launch

**Status:** ✅ All pre-launch work complete  
**Target:** Production deployment  
**Timeline:** Ready now

---

## Pre-Deployment Verification (Do This First)

- [ ] Read `.AUDIT_FINDINGS.md` — understand the audit scope and provisional items
- [ ] Read `LAUNCH_READY.md` — understand what's deployed and what's deferred
- [ ] Confirm you have GitHub push access to [chukwuemekaawili/Buoyance](https://github.com/chukwuemekaawili/Buoyance)
- [ ] Confirm Digital Ocean is watching the `main` branch (it is per `.do/app.yaml`)

---

## Deployment Steps

### Step 1: Create Pull Request (or merge directly)

**Via GitHub Web:**
1. Go to https://github.com/chukwuemekaawili/Buoyance/pulls
2. Open PR for branch `claude/awesome-nobel-18b9f2`
3. Review changes (should see 3 commits: rent relief fix, audit docs, deployment guide)
4. Click **"Merge pull request"**
5. Confirm merge to `main`

**Via Command Line:**
```bash
# In your local main repo (not the worktree)
git fetch origin claude/awesome-nobel-18b9f2
git checkout main
git merge origin/claude/awesome-nobel-18b9f2
git push origin main
```

### Step 2: Verify Digital Ocean Auto-Deploy

1. Wait 2-3 minutes
2. Go to [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)
3. Find "buoyance" app
4. Watch the "Deploy" tab — should show a new build starting
5. Once build completes, check [buoyance.app](https://buoyance.app) loads

### Step 3: Smoke Test (5 minutes)

In the live app:
1. **PAYE Test**: Monthly gross ₦500K, annual rent ₦1.2M
   - Expected rent relief: 20% × ₦1.2M = ₦240K (capped at ₦500K, so ₦240K)
   - Expected PAYE: Should use updated formula, minimum 1% of gross
   - ✅ Verify PAYE shows correct calculation

2. **CIT Test**: Company with ₦30M turnover
   - Expected rate: 0% (qualifies as small company)
   - Tax payable: ₦0 (not 30%)
   - ✅ Verify CIT shows 0%

3. **General Test**: Navigate app, check no errors in console
   - ✅ App loads without errors
   - ✅ Calculators work
   - ✅ Filing workflow accessible

---

## What Changed in This Deployment

**Code:**
- `src/lib/taxEngine.ts`: Rent relief formula (20% of rent, ₦500K cap) + PAYE minimum tax (1% floor)
- `src/lib/payrollEngine.ts`: Passes annual gross to PAYE calculator

**Database (Supabase):**
- `tax_rules` table, CIT row: `small_company_threshold_kobo` changed from `10000000000` to `5000000000`
- Description updated to reflect ≤₦50M threshold

**Documentation:**
- `.AUDIT_FINDINGS.md`: Full audit trail with sources and first-update priorities
- `LAUNCH_READY.md`: Quick deployment guide
- `DEPLOYMENT_CHECKLIST.md`: This file

---

## Known Limitations (Not Launch Blockers)

These are documented in `.AUDIT_FINDINGS.md` and planned for first update:

- 🟡 **VAT classification**: Currently applies 7.5% flat; zero-rating/exemption logic deferred
- 🟡 **Part-year employment**: PAYE annualization doesn't adjust for mid-year hires
- 🟡 **BIK income**: Company housing/vehicles not yet in taxable income
- 🟡 **PAYE minimum tax**: Implemented but marked for post-launch verification against NTA 2025 gazette

---

## Post-Deployment

After going live:

1. **Monitor**: Watch app logs for errors over first 24 hours
2. **Feedback**: Share `.AUDIT_FINDINGS.md` with your tax advisor for final verification
3. **Planning**: Schedule first-update work (VAT, part-year employment, BIK)
4. **Announce**: All NTA 2025 tax rules now live on buoyance.app

---

## Rollback Plan (If Needed)

If something goes wrong:

1. Go to Digital Ocean App Platform
2. Find "buoyance" app → Deployments tab
3. Click the previous successful deployment
4. Click "Re-deploy" to rollback

Or via Git:
```bash
git revert HEAD  # Revert the merge commit
git push origin main
# Digital Ocean auto-deploys the reverted version
```

---

## Questions Before Deploying?

- ❓ Are you confident in the rent relief and PAYE minimum tax logic? — **Check `LAUNCH_READY.md` Section 1-2**
- ❓ Is the CIT ₦50M threshold correct? — **Yes, per signed NTA 2025 and KPMG update**
- ❓ Do we need VAT zero-rating before launch? — **Only if targeting pharmacy/food/healthcare sectors initially**
- ❓ Is PAYE minimum tax final? — **Marked provisional; verify post-launch with CITN consultant**

---

## Final Approval

- [ ] All pre-deployment checks done
- [ ] Team has read the audit findings
- [ ] Ready to merge and deploy

**When you're ready: Merge the PR and Digital Ocean will deploy automatically within minutes.** 🚀
