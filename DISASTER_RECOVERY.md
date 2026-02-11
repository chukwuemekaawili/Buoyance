# Disaster Recovery Procedures

## Buoyance Tax Platform - Disaster Recovery Plan

**Version:** 1.0  
**Last Updated:** January 2026  
**Owner:** Platform Engineering Team

---

## 1. Overview

This document outlines the disaster recovery (DR) procedures for the Buoyance tax compliance platform. The goal is to ensure business continuity and data integrity in the event of system failures, data loss, or catastrophic events.

## 2. Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| **RTO** (Recovery Time Objective) | 4 hours | Maximum acceptable downtime |
| **RPO** (Recovery Point Objective) | 1 hour | Maximum acceptable data loss |
| **MTTR** (Mean Time to Recovery) | 2 hours | Average recovery time |

## 3. Critical Systems

### 3.1 Primary Systems
- **Supabase PostgreSQL Database** - All user data, calculations, filings
- **Supabase Auth** - User authentication and sessions
- **Supabase Edge Functions** - Backend logic and integrations
- **Supabase Storage** - Document uploads and receipts
- **Frontend Application** - React SPA hosted on Lovable

### 3.2 External Dependencies
- Payment Gateway (Paystack/Flutterwave)
- Banking Integration (Mono/Okra)
- Email Service (Resend/SendGrid)
- AI Gateway (Lovable AI)

## 4. Backup Procedures

### 4.1 Database Backups

**Automatic Backups (Supabase Managed)**
- Point-in-time recovery enabled
- Daily automated backups retained for 7 days (Pro plan)
- Backup location: Supabase-managed infrastructure

**Manual Backup Procedure**
```bash
# Export database via Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d).sql

# Backup to secure storage
aws s3 cp backup_$(date +%Y%m%d).sql s3://buoyance-backups/db/
```

### 4.2 Storage Backups
- User uploads are stored in Supabase Storage buckets
- Enable bucket versioning for document protection
- Sync to external backup storage weekly

### 4.3 Configuration Backups
- Store all Edge Function code in Git
- Document all environment variables (names only, not values)
- Maintain infrastructure-as-code for reproducibility

## 5. Recovery Procedures

### 5.1 Database Recovery

**Scenario: Database Corruption or Data Loss**

1. **Identify the failure point**
   ```sql
   -- Check recent changes
   SELECT * FROM audit_logs 
   ORDER BY created_at DESC 
   LIMIT 100;
   ```

2. **Request point-in-time recovery from Supabase**
   - Go to Supabase Dashboard → Database → Backups
   - Select recovery point (nearest to failure)
   - Initiate recovery

3. **Verify data integrity**
   ```sql
   -- Verify key tables
   SELECT COUNT(*) FROM profiles;
   SELECT COUNT(*) FROM tax_calculations;
   SELECT COUNT(*) FROM filings;
   SELECT COUNT(*) FROM payments;
   ```

4. **Notify users if data loss occurred**

### 5.2 Application Recovery

**Scenario: Frontend Application Failure**

1. **Check build status in Lovable**
2. **Review deployment logs**
3. **Rollback to previous working version if needed**
4. **Clear CDN cache if required**

### 5.3 Edge Function Recovery

**Scenario: Edge Function Failures**

1. **Check function logs**
   ```bash
   supabase functions logs <function-name>
   ```

2. **Verify secrets are configured**
   - Check Supabase Dashboard → Edge Functions → Secrets

3. **Redeploy functions**
   ```bash
   supabase functions deploy <function-name>
   ```

### 5.4 Complete System Recovery

**Scenario: Total System Failure**

1. **Provision new Supabase project**
   - Restore from latest backup
   - Reconfigure all secrets

2. **Deploy Edge Functions**
   - Clone repository
   - Deploy all functions

3. **Update DNS/environment variables**
   - Update VITE_SUPABASE_URL
   - Update VITE_SUPABASE_PUBLISHABLE_KEY

4. **Verify all integrations**
   - Test auth flow
   - Test calculation save
   - Test filing workflow

## 6. Communication Plan

### 6.1 Internal Escalation
| Severity | Response Time | Notification |
|----------|--------------|--------------|
| Critical (P1) | 15 minutes | All hands, phone call |
| High (P2) | 1 hour | Engineering team, Slack |
| Medium (P3) | 4 hours | Engineering lead, email |
| Low (P4) | 24 hours | Ticket system |

### 6.2 User Communication
- **Status Page**: Update immediately when issue detected
- **Email**: Notify affected users within 2 hours
- **In-App Banner**: Display maintenance notice

### 6.3 Communication Templates

**Incident Notification:**
```
Subject: [Buoyance] Service Disruption Notice

We are currently experiencing technical difficulties affecting [specific service].
Our team is actively working to resolve the issue.

Impact: [Description of impact]
Estimated Resolution: [Time estimate]

We apologize for any inconvenience and will provide updates every 30 minutes.
```

**Resolution Notification:**
```
Subject: [Buoyance] Service Restored

The technical issues affecting [specific service] have been resolved.
All services are now operating normally.

Root Cause: [Brief explanation]
Duration: [Start time] to [End time]
Data Impact: [None/Details]

Thank you for your patience.
```

## 7. Testing Schedule

| Test Type | Frequency | Last Tested | Next Scheduled |
|-----------|-----------|-------------|----------------|
| Backup Verification | Monthly | - | - |
| Restore Drill | Quarterly | - | - |
| Failover Test | Bi-annually | - | - |
| Full DR Exercise | Annually | - | - |

### 7.1 Test Procedures

**Monthly Backup Verification:**
1. Download latest backup
2. Restore to test environment
3. Verify data integrity
4. Document results

**Quarterly Restore Drill:**
1. Create isolated test environment
2. Perform full restoration
3. Verify all features work
4. Measure actual RTO
5. Document any issues

## 8. Contacts

| Role | Name | Contact |
|------|------|---------|
| Incident Commander | TBD | - |
| Engineering Lead | TBD | - |
| Supabase Support | - | support@supabase.io |
| Lovable Support | - | support@lovable.dev |

## 9. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | System | Initial creation |

---

## Appendix A: Quick Reference Commands

```bash
# Check database status
supabase db status

# Check function logs
supabase functions logs integration-health

# Export specific table
supabase db dump --table=tax_calculations -f tax_calculations_backup.sql

# List all backups
supabase db backups list
```

## Appendix B: Critical Queries

```sql
-- Check user count
SELECT COUNT(*) as users FROM auth.users;

-- Check recent filings
SELECT tax_type, status, COUNT(*) 
FROM filings 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY tax_type, status;

-- Check payment status
SELECT status, verification_status, COUNT(*) 
FROM payments 
GROUP BY status, verification_status;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```
