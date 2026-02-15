// Tax Knowledge Base Service
// Manages tax law library, articles, guides, and search

import { supabase } from '@/integrations/supabase/client';

export type ArticleCategory = 'tax_law' | 'guide' | 'circular' | 'case_law' | 'faq' | 'course' | 'update';

export interface KnowledgeArticle {
    id: string;
    title: string;
    category: ArticleCategory;
    content: string;
    summary: string;
    tax_types: string[];
    tags: string[];
    source?: string;
    source_url?: string;
    effective_date?: string;
    published: boolean;
    created_at: string;
}

// Built-in knowledge base (seeded data)
export const BUILT_IN_ARTICLES: Omit<KnowledgeArticle, 'id' | 'created_at'>[] = [
    {
        title: 'Nigeria Tax Act 2025 - Summary of Key Changes',
        category: 'tax_law',
        content: `# Nigeria Tax Act (NTA) 2025 - Key Changes

## CRA Abolished
The Consolidated Relief Allowance (CRA) has been replaced with Rent Relief. Employees who pay rent can claim a relief of the lower of ₦500,000 or 20% of annual rent paid.

## PAYE Brackets Updated
- First ₦800,000: 0% (exempt)
- ₦800,001 - ₦3,000,000: 15%
- ₦3,000,001 - ₦12,000,000: 18%
- ₦12,000,001 - ₦25,000,000: 21%
- ₦25,000,001 - ₦50,000,000: 23%
- Above ₦50,000,000: 25%

## CIT 3-Tier System
- Small Company (turnover ≤ ₦100M): 0% CIT
- Medium Company (₦100M - ₦250M): 20% CIT
- Large Company (> ₦250M): 30% CIT

**Important:** Professional services (legal, accounting, medical, etc.) are excluded from the small company exemption per Section 202.

## Development Levy
4% development levy applies to medium and large companies in addition to CIT.

## VAT
VAT rate remains at 7.5%. Threshold registration is ₦25M annual turnover.`,
        summary: 'Overview of major changes in NTA 2025 including CRA abolition, updated PAYE brackets, and CIT 3-tier system',
        tax_types: ['PAYE', 'CIT', 'VAT'],
        tags: ['NTA 2025', 'tax reform', 'PAYE', 'CIT', 'CRA'],
        source: 'Nigeria Tax Act 2025',
        published: true,
    },
    {
        title: 'WHT Rates by Transaction Type (2024 Regulations)',
        category: 'guide',
        content: `# Withholding Tax Rates - Complete Guide

## What is WHT?
Withholding Tax is an advance payment of income tax deducted at source by the payer on behalf of the payee.

## Rates for Nigerian Residents
| Transaction Type | Rate |
|---|---|
| Dividend | 10% |
| Interest | 10% |
| Rent | 10% |
| Royalty | 10% |
| Commission | 10% |
| Consultancy/Professional Services | 10% |
| Management Fees | 10% |
| Technical Fees | 10% |
| Contract (general) | 5% |
| Supply of goods | 5% |
| Construction | 2.5% |

## Non-Resident Rates
Non-resident rates are generally higher (10-15%). Check specific treaties for applicable rates.

## Remittance Deadline
WHT must be remitted to FIRS within 21 days after the end of the month in which it was deducted.

## WHT Certificate
The deducting party must issue a WHT certificate to the payee, who can use it as a credit against their income tax liability.`,
        summary: 'Complete WHT rates for all transaction types with remittance deadlines and certificate requirements',
        tax_types: ['WHT'],
        tags: ['WHT', 'withholding tax', 'rates', 'certificates'],
        source: 'WHT Regulations 2024',
        published: true,
    },
    {
        title: 'How to File VAT Returns on TaxProMax',
        category: 'guide',
        content: `# Filing VAT Returns on TaxProMax - Step by Step

## Prerequisites
1. Active TIN (Tax Identification Number)
2. TaxProMax account (register at taxpromax.firs.gov.ng)
3. Transaction records for the filing period

## Step-by-Step Process

### Step 1: Log in to TaxProMax
Visit taxpromax.firs.gov.ng and sign in with your credentials.

### Step 2: Navigate to VAT Filing
Click "E-Filing" → "VAT" → "New Return"

### Step 3: Upload Transaction Data
You can either:
- Enter transactions manually
- Upload a CSV file (Buoyance can generate this for you!)

### Step 4: Review and Submit
- Verify output VAT and input VAT totals
- Check the net VAT payable
- Click "Submit"

### Step 5: Generate DIN
After submission, a DIN (Demand Identification Number) is generated.
- Save this DIN in Buoyance for tracking
- Use the DIN to make payment via Remita or bank

### Step 6: Make Payment
Pay via:
- Remita (online)
- Bank transfer (with DIN reference)
- Designated bank branch

### Step 7: Confirm in Buoyance
Enter the DIN and upload payment receipt in Buoyance to reconcile.

## Common Errors
- **Incorrect TIN**: Verify your TIN at tinverification.firs.gov.ng
- **Mismatched amounts**: Always use Buoyance CSV export for accuracy
- **Late filing**: ₦50,000 penalty for first month + ₦25,000/month thereafter`,
        summary: 'Step-by-step guide for filing VAT returns on TaxProMax portal with DIN tracking',
        tax_types: ['VAT'],
        tags: ['TaxProMax', 'VAT filing', 'DIN', 'e-filing', 'guide'],
        published: true,
    },
    {
        title: 'TCC Requirements and Application Process',
        category: 'guide',
        content: `# Tax Clearance Certificate (TCC) - Complete Guide

## What is a TCC?
A Tax Clearance Certificate confirms that a taxpayer has fulfilled their tax obligations for the preceding 3 years.

## When You Need a TCC
- Government contract bidding
- Bank loan applications
- Import/export licenses
- Certificate of occupancy applications
- Corporate registrations at CAC

## Requirements (Federal/FIRS)
1. Tax returns filed for 3 preceding years
2. Evidence of tax payments (receipts/DINs)
3. Valid TIN certificate
4. CAC certificate (companies)
5. Audited financial statements (companies)
6. Valid ID (NIN, passport, driver's license)

## Application Process
1. Gather all required documents
2. Submit application at FIRS office or via TaxProMax
3. FIRS reviews within 14-21 working days
4. Collect TCC upon approval

## TCC Validity
- Valid for 1 year from date of issue
- Must be renewed annually

## Tips
- Use Buoyance TCC Readiness tool to track requirements
- Generate evidence pack for easy submission
- Start preparation 4-6 weeks before you need the TCC`,
        summary: 'Complete guide to Tax Clearance Certificate requirements, application, and processing',
        tax_types: ['PIT', 'CIT'],
        tags: ['TCC', 'tax clearance', 'requirements', 'application'],
        published: true,
    },
    {
        title: 'Compliance Deadlines Calendar 2026',
        category: 'guide',
        content: `# Tax Compliance Deadlines 2026

## Monthly Deadlines
| Deadline | Tax Type | Authority | Description |
|---|---|---|---|
| 7th | Pension | PFA | Employee + employer contributions |
| 10th | PAYE | State IRS | Previous month's PAYE deductions |
| 16th | NSITF | NSITF | Employer contribution (1%) |
| 21st | VAT | FIRS | Previous month's VAT return + payment |
| 21st | WHT | FIRS | Previous month's WHT remittance |
| 30th | NHF | FMBN | Employee NHF contributions |

## Annual Deadlines
| Deadline | Tax Type | Authority | Description |
|---|---|---|---|
| March 31 | PIT | State IRS | Annual self-assessment return |
| June 30 | CIT | FIRS | Company annual return (Dec year-end) |
| Jan 31 | CIT | FIRS | Self-assessment payment |

## Penalties for Late Filing
- VAT: ₦50,000 first month + ₦25,000/month
- PAYE: 10% penalty + interest
- CIT: ₦50,000 + ₦25,000/month
- PIT: ₦50,000 + ₦5,000/month`,
        summary: '2026 tax compliance calendar with all monthly and annual deadlines',
        tax_types: ['VAT', 'PAYE', 'CIT', 'WHT', 'PIT'],
        tags: ['deadlines', 'calendar', 'penalties', '2026'],
        published: true,
    },
];

export async function searchArticles(query: string, category?: ArticleCategory): Promise<KnowledgeArticle[]> {
    // Client-side search through built-in articles
    const lowerQuery = query.toLowerCase();
    let results = BUILT_IN_ARTICLES.filter(article => {
        const searchable = `${article.title} ${article.summary} ${article.tags.join(' ')} ${article.content}`.toLowerCase();
        return searchable.includes(lowerQuery);
    });

    if (category) {
        results = results.filter(a => a.category === category);
    }

    return results.map((a, i) => ({
        ...a,
        id: `builtin-${i}`,
        created_at: new Date().toISOString(),
    }));
}

export function getArticlesByCategory(category: ArticleCategory): KnowledgeArticle[] {
    return BUILT_IN_ARTICLES
        .filter(a => a.category === category)
        .map((a, i) => ({
            ...a,
            id: `builtin-${i}`,
            created_at: new Date().toISOString(),
        }));
}

export function getArticlesByTaxType(taxType: string): KnowledgeArticle[] {
    return BUILT_IN_ARTICLES
        .filter(a => a.tax_types.includes(taxType))
        .map((a, i) => ({
            ...a,
            id: `builtin-${i}`,
            created_at: new Date().toISOString(),
        }));
}

export function getCategoryLabel(category: ArticleCategory): string {
    const labels: Record<ArticleCategory, string> = {
        tax_law: 'Tax Laws & Regulations',
        guide: 'How-To Guides',
        circular: 'FIRS Circulars',
        case_law: 'Case Law',
        faq: 'FAQs',
        course: 'Courses',
        update: 'Tax Updates',
    };
    return labels[category] || category;
}

export function getCategoryIcon(category: ArticleCategory): string {
    const icons: Record<ArticleCategory, string> = {
        tax_law: '📜',
        guide: '📖',
        circular: '📋',
        case_law: '⚖️',
        faq: '❓',
        course: '🎓',
        update: '📰',
    };
    return icons[category] || '📄';
}
