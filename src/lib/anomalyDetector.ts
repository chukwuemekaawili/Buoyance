// Anomaly Detection Engine
// Catches tax filing errors, discrepancies, and compliance risks

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnomalyType =
    | 'VAT_UNDER_DECLARATION'
    | 'VAT_OVER_DECLARATION'
    | 'PAYE_BRACKET_MISMATCH'
    | 'WHT_RATE_ERROR'
    | 'WHT_UNCLAIMED_CREDIT'
    | 'CIT_TIER_MISMATCH'
    | 'DUPLICATE_PAYMENT'
    | 'MISSING_TIN'
    | 'INCOME_EXPENSE_RATIO'
    | 'FILING_GAP'
    | 'DEDUCTION_EXCEEDS_INCOME'
    | 'PERIOD_MISMATCH';

export interface Anomaly {
    type: AnomalyType;
    severity: AnomalySeverity;
    title: string;
    description: string;
    recommendation: string;
    potential_penalty_kobo?: number;
    related_entity_id?: string;
    related_entity_type?: string;
}

export interface FilingForAudit {
    id: string;
    tax_type: string;
    period_start: string;
    period_end: string;
    // VAT
    output_vat_kobo?: number;
    input_vat_kobo?: number;
    net_vat_kobo?: number;
    total_sales_kobo?: number;
    // PAYE
    gross_salary_kobo?: number;
    computed_paye_kobo?: number;
    // WHT
    total_wht_deducted_kobo?: number;
    wht_rate_applied?: number;
    transaction_type?: string;
    // CIT
    turnover_kobo?: number;
    assessable_profit_kobo?: number;
    cit_rate_applied?: number;
    sector?: string;
}

export interface TransactionForAudit {
    id: string;
    amount_kobo: number;
    description: string;
    date: string;
    category: string;
}

// VAT anomaly checks
function checkVATAnomalies(filing: FilingForAudit): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Under-declaration: Output VAT on sales vs declared
    if (filing.total_sales_kobo && filing.output_vat_kobo) {
        const expectedVAT = Math.round(filing.total_sales_kobo * 0.075);
        const difference = expectedVAT - filing.output_vat_kobo;

        if (difference > 500000) { // > ₦5,000 difference
            anomalies.push({
                type: 'VAT_UNDER_DECLARATION',
                severity: difference > 5000000 ? 'critical' : 'high',
                title: 'VAT Under-Declaration Detected',
                description: `Total sales of ₦${(filing.total_sales_kobo / 100).toLocaleString()} should generate ₦${(expectedVAT / 100).toLocaleString()} output VAT, but only ₦${(filing.output_vat_kobo / 100).toLocaleString()} was declared. Shortfall: ₦${(difference / 100).toLocaleString()}.`,
                recommendation: 'Review sales records and ensure all VAT-eligible sales are included. Check for exempt supplies that may have been incorrectly excluded.',
                potential_penalty_kobo: Math.round(difference * 1.1), // Shortfall + 10% penalty
                related_entity_id: filing.id,
                related_entity_type: 'filing',
            });
        }
    }

    // Input VAT exceeds Output (potential refund situation)
    if (filing.input_vat_kobo && filing.output_vat_kobo && filing.input_vat_kobo > filing.output_vat_kobo * 1.5) {
        anomalies.push({
            type: 'VAT_OVER_DECLARATION',
            severity: 'medium',
            title: 'Input VAT Significantly Exceeds Output VAT',
            description: `Input VAT (₦${(filing.input_vat_kobo / 100).toLocaleString()}) is ${((filing.input_vat_kobo / filing.output_vat_kobo) * 100).toFixed(0)}% of Output VAT. This may trigger FIRS review.`,
            recommendation: 'Ensure all input VAT claims are supported by valid tax invoices. Prepare documentation for potential FIRS inquiry.',
            related_entity_id: filing.id,
            related_entity_type: 'filing',
        });
    }

    return anomalies;
}

// PAYE anomaly checks
function checkPAYEAnomalies(filing: FilingForAudit): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (filing.gross_salary_kobo && filing.computed_paye_kobo) {
        const effectiveRate = filing.computed_paye_kobo / filing.gross_salary_kobo;

        // First ₦800K is exempt under NTA 2025
        if (filing.gross_salary_kobo <= 80000000 && filing.computed_paye_kobo > 0) {
            anomalies.push({
                type: 'PAYE_BRACKET_MISMATCH',
                severity: 'high',
                title: 'PAYE Applied Below Exempt Threshold',
                description: `Annual salary of ₦${(filing.gross_salary_kobo / 100).toLocaleString()} is within the ₦800,000 exempt threshold. No PAYE should be charged.`,
                recommendation: 'Review tax calculation. Under NTA 2025, the first ₦800,000 of income is exempt from PAYE.',
                potential_penalty_kobo: filing.computed_paye_kobo,
                related_entity_id: filing.id,
                related_entity_type: 'filing',
            });
        }

        // Rate exceeds 25% (max marginal rate)
        if (effectiveRate > 0.25) {
            anomalies.push({
                type: 'PAYE_BRACKET_MISMATCH',
                severity: 'high',
                title: 'Effective PAYE Rate Exceeds Maximum',
                description: `Effective rate of ${(effectiveRate * 100).toFixed(1)}% exceeds the maximum 25% marginal rate. Check deduction calculations.`,
                recommendation: 'Verify that all applicable reliefs (rent, pension, NHF) have been deducted before computing PAYE.',
                related_entity_id: filing.id,
                related_entity_type: 'filing',
            });
        }
    }

    return anomalies;
}

// WHT anomaly checks
function checkWHTAnomalies(filing: FilingForAudit): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check correct WHT rate was applied
    const WHT_RATES: Record<string, number> = {
        'contract': 0.05,
        'consultancy': 0.10,
        'professional_services': 0.10,
        'rent': 0.10,
        'dividend': 0.10,
        'interest': 0.10,
        'royalty': 0.10,
        'commission': 0.10,
        'construction': 0.025,
        'supply': 0.05,
    };

    if (filing.transaction_type && filing.wht_rate_applied) {
        const expectedRate = WHT_RATES[filing.transaction_type];
        if (expectedRate && Math.abs(filing.wht_rate_applied - expectedRate) > 0.001) {
            anomalies.push({
                type: 'WHT_RATE_ERROR',
                severity: 'high',
                title: `Incorrect WHT Rate for ${filing.transaction_type}`,
                description: `Applied rate: ${(filing.wht_rate_applied * 100).toFixed(1)}%. Expected rate for "${filing.transaction_type}": ${(expectedRate * 100).toFixed(1)}%.`,
                recommendation: `Update the WHT rate to ${(expectedRate * 100).toFixed(1)}% per Schedule 2 of the WHT Regulations.`,
                related_entity_id: filing.id,
                related_entity_type: 'filing',
            });
        }
    }

    return anomalies;
}

// CIT anomaly checks
function checkCITAnomalies(filing: FilingForAudit): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (filing.turnover_kobo && filing.cit_rate_applied !== undefined) {
        const PROFESSIONAL_SECTORS = [
            'legal_services', 'accounting_services', 'medical_services',
            'architectural_services', 'engineering_consulting',
        ];

        // Small company claiming 0% but is professional service
        if (filing.turnover_kobo <= 10000000000 && filing.cit_rate_applied === 0 && filing.sector) {
            if (PROFESSIONAL_SECTORS.includes(filing.sector)) {
                anomalies.push({
                    type: 'CIT_TIER_MISMATCH',
                    severity: 'critical',
                    title: 'Professional Services Cannot Claim Small Company Exemption',
                    description: `Sector "${filing.sector}" is excluded from the 0% small company rate per Section 202 NTA 2025. Minimum rate is 20%.`,
                    recommendation: 'Apply 20% CIT rate (medium company) or 30% (large company) even if turnover is below ₦100M.',
                    potential_penalty_kobo: filing.assessable_profit_kobo ? Math.round(filing.assessable_profit_kobo * 0.20) : undefined,
                    related_entity_id: filing.id,
                    related_entity_type: 'filing',
                });
            }
        }

        // Wrong tier
        if (filing.turnover_kobo > 25000000000 && filing.cit_rate_applied === 0.20) {
            anomalies.push({
                type: 'CIT_TIER_MISMATCH',
                severity: 'high',
                title: 'CIT Rate Too Low for Turnover',
                description: `Turnover exceeds ₦250M but 20% rate applied. Should be 30%.`,
                recommendation: 'Apply 30% CIT rate for large companies (turnover > ₦250M).',
                related_entity_id: filing.id,
                related_entity_type: 'filing',
            });
        }
    }

    return anomalies;
}

// General checks
function checkGeneralAnomalies(transactions: TransactionForAudit[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Duplicate payment detection
    const seen = new Map<string, TransactionForAudit>();
    for (const txn of transactions) {
        const key = `${txn.amount_kobo}_${txn.description.toLowerCase().trim()}`;
        const existing = seen.get(key);
        if (existing) {
            const daysDiff = Math.abs(
                (new Date(txn.date).getTime() - new Date(existing.date).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysDiff < 7) {
                anomalies.push({
                    type: 'DUPLICATE_PAYMENT',
                    severity: 'medium',
                    title: 'Possible Duplicate Payment',
                    description: `Two transactions of ₦${(txn.amount_kobo / 100).toLocaleString()} to "${txn.description}" within ${daysDiff.toFixed(0)} days.`,
                    recommendation: 'Verify this is not a duplicate. If it is, mark one for reversal.',
                    related_entity_id: txn.id,
                    related_entity_type: 'transaction',
                });
            }
        }
        seen.set(key, txn);
    }

    // Deductions > Income
    const totalIncome = transactions
        .filter(t => ['Salary Income', 'Professional Income', 'Rental Income', 'Investment Income'].includes(t.category))
        .reduce((sum, t) => sum + t.amount_kobo, 0);

    const totalDeductions = transactions
        .filter(t => ['Office Expenses', 'Transportation', 'Professional Services', 'Equipment'].includes(t.category))
        .reduce((sum, t) => sum + t.amount_kobo, 0);

    if (totalIncome > 0 && totalDeductions > totalIncome * 0.8) {
        anomalies.push({
            type: 'DEDUCTION_EXCEEDS_INCOME',
            severity: 'high',
            title: 'Deductions Exceed 80% of Income',
            description: `Total deductions (₦${(totalDeductions / 100).toLocaleString()}) are ${((totalDeductions / totalIncome) * 100).toFixed(0)}% of income. This may trigger FIRS audit.`,
            recommendation: 'Review deductions for accuracy. High deduction-to-income ratios are a common FIRS audit trigger.',
        });
    }

    return anomalies;
}

// Main detection function
export function detectAnomalies(
    filing: FilingForAudit,
    transactions: TransactionForAudit[] = []
): Anomaly[] {
    const allAnomalies: Anomaly[] = [];

    switch (filing.tax_type) {
        case 'VAT':
            allAnomalies.push(...checkVATAnomalies(filing));
            break;
        case 'PAYE':
            allAnomalies.push(...checkPAYEAnomalies(filing));
            break;
        case 'WHT':
            allAnomalies.push(...checkWHTAnomalies(filing));
            break;
        case 'CIT':
            allAnomalies.push(...checkCITAnomalies(filing));
            break;
    }

    allAnomalies.push(...checkGeneralAnomalies(transactions));

    // Sort by severity
    const severityOrder: Record<AnomalySeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return allAnomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export function getSeverityColor(severity: AnomalySeverity): string {
    const colors: Record<AnomalySeverity, string> = {
        critical: 'red',
        high: 'orange',
        medium: 'yellow',
        low: 'blue',
    };
    return colors[severity];
}

export function getSeverityIcon(severity: AnomalySeverity): string {
    const icons: Record<AnomalySeverity, string> = {
        critical: '🚨',
        high: '⚠️',
        medium: '⚡',
        low: 'ℹ️',
    };
    return icons[severity];
}
