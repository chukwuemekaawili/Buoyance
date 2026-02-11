# Nigerian Data Residency Verification

## Buoyance Tax Platform - Data Residency Compliance

**Version:** 1.0  
**Last Updated:** January 2026  
**Compliance Officer:** TBD

---

## 1. Overview

This document verifies and documents the data residency configuration for the Buoyance tax compliance platform, ensuring compliance with Nigerian data protection regulations including the Nigeria Data Protection Regulation (NDPR) 2019 and the Nigeria Data Protection Act (NDPA) 2023.

## 2. Regulatory Requirements

### 2.1 NDPR/NDPA Key Requirements
- Personal data of Nigerian citizens should be processed in Nigeria where possible
- If processed outside Nigeria, adequate protection measures must be in place
- Data controllers must implement appropriate technical and organizational measures
- Data breach notification within 72 hours
- Data Protection Impact Assessments for high-risk processing

### 2.2 Tax Data Specific Requirements
- Tax filings and calculations contain sensitive financial data
- Must comply with FIRS data handling guidelines
- Audit trail requirements for financial records

## 3. Current Infrastructure Configuration

### 3.1 Supabase Configuration

| Component | Location | Status |
|-----------|----------|--------|
| Supabase Project | See dashboard | Verify in project settings |
| PostgreSQL Database | Supabase-managed | Check region setting |
| Edge Functions | Supabase Edge | Globally distributed |
| Storage Buckets | Supabase Storage | Same region as database |

**Verification Steps:**
1. Log into Supabase Dashboard
2. Navigate to Project Settings → General
3. Check "Region" field
4. Document the configured region

### 3.2 Available Supabase Regions

As of documentation date, Supabase offers:
- **Africa**: South Africa (Johannesburg)
- **Europe**: Multiple regions
- **Americas**: Multiple regions
- **Asia Pacific**: Multiple regions

**Recommended Configuration:**
- Primary Region: South Africa (Johannesburg) - closest to Nigeria
- This provides the lowest latency for Nigerian users
- Data remains on the African continent

### 3.3 CDN and Edge Configuration

| Service | Provider | Edge Locations |
|---------|----------|----------------|
| Frontend Hosting | Lovable/CDN | Global distribution |
| Static Assets | CDN | Cached at edge |
| API Requests | Supabase | Origin region |

## 4. Data Classification

### 4.1 Data Types Stored

| Data Type | Sensitivity | Storage Location | Encryption |
|-----------|-------------|------------------|------------|
| User Authentication | High | Supabase Auth | AES-256 |
| Tax Calculations | High | PostgreSQL | At rest + Transit |
| Filings | High | PostgreSQL | At rest + Transit |
| Payments | High | PostgreSQL | At rest + Transit |
| Documents | Medium | Storage Bucket | At rest + Transit |
| Audit Logs | Medium | PostgreSQL | At rest + Transit |
| Notifications | Low | PostgreSQL | At rest + Transit |

### 4.2 Data Retention Periods

| Data Type | Retention Period | Legal Basis |
|-----------|------------------|-------------|
| Tax Calculations | 7 years | Tax law requirements |
| Filings | 7 years | FIRS requirements |
| Payments | 7 years | Financial regulations |
| Audit Logs | 7 years | Compliance requirements |
| User Accounts | Account lifetime + 2 years | NDPR |

## 5. Security Measures

### 5.1 Encryption

**At Rest:**
- PostgreSQL: AES-256 encryption enabled
- Storage: Server-side encryption enabled
- Backups: Encrypted

**In Transit:**
- All connections use TLS 1.2+
- HTTPS enforced for all endpoints
- Secure WebSocket for real-time features

### 5.2 Access Controls

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Admin roles with elevated privileges are audited
- All actions logged to audit_logs table

### 5.3 Authentication

- Supabase Auth with secure password hashing
- Session management with secure tokens
- Optional MFA (when implemented)

## 6. Cross-Border Data Transfers

### 6.1 Current Status

| External Service | Data Transferred | Purpose | Safeguards |
|------------------|------------------|---------|------------|
| Lovable AI Gateway | Query text only | AI explanations | No PII transmitted |
| Payment Gateway | Transaction data | Payment processing | PCI DSS compliant |
| Email Provider | Email addresses | Notifications | DPA in place |
| Banking API | Account tokens | Transaction import | OAuth, no credentials stored |

### 6.2 Safeguards for International Transfers

1. **Standard Contractual Clauses (SCCs)** - Where applicable
2. **Data Processing Agreements** - With all vendors
3. **Encryption** - All data encrypted in transit
4. **Minimization** - Only necessary data transferred

## 7. Compliance Checklist

### 7.1 NDPR Compliance

- [x] Data minimization practiced
- [x] Purpose limitation defined
- [x] Storage limitation enforced
- [x] Encryption implemented
- [x] Access controls in place
- [x] Audit logging enabled
- [ ] DPO appointed (Pending)
- [ ] NDPR registration (Pending)

### 7.2 Technical Compliance

- [x] RLS enabled on all tables
- [x] HTTPS enforced
- [x] Password hashing (bcrypt)
- [x] Input validation implemented
- [x] SQL injection protection (Supabase)
- [x] XSS protection (React)

## 8. Recommendations

### 8.1 Immediate Actions

1. **Verify Supabase Region**
   - Confirm project is in South Africa region
   - If not, evaluate migration to reduce latency

2. **Complete NDPR Registration**
   - Register with NITDA as a data controller
   - Appoint Data Protection Officer

3. **Document Vendor DPAs**
   - Obtain signed DPAs from all service providers
   - Maintain register of processing activities

### 8.2 Future Improvements

1. **Consider Nigerian Hosting Options**
   - Evaluate local cloud providers if regulations require
   - Monitor for Nigerian-based Supabase availability

2. **Enhanced Data Controls**
   - Implement data export functionality
   - Add account deletion workflow
   - Provide data portability

## 9. Verification Log

| Date | Verified By | Configuration | Notes |
|------|-------------|---------------|-------|
| Jan 2026 | System | Initial setup | Document created |

## 10. Contact Information

| Role | Contact |
|------|---------|
| Data Protection Officer | TBD |
| NITDA | info@nitda.gov.ng |
| Supabase Support | support@supabase.io |

---

## Appendix: NDPR Principles Mapping

| NDPR Principle | Implementation |
|----------------|----------------|
| Lawfulness, Fairness, Transparency | Privacy policy, consent mechanisms |
| Purpose Limitation | Data only used for tax services |
| Data Minimization | Only collect necessary data |
| Accuracy | User can update their data |
| Storage Limitation | 7-year retention policy |
| Integrity and Confidentiality | Encryption, access controls |
| Accountability | Audit logs, documentation |
