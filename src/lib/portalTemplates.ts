// TaxProMax & LIRS CSV Template Generators
// Generates portal-ready CSV exports for Nigerian tax filings

import Papa from 'papaparse';

export interface FilingData {
    id: string;
    tax_type: string;
    period_start: string;
    period_end: string;
    taxpayer_name: string;
    tin: string;
    // VAT fields
    output_vat_kobo?: number;
    input_vat_kobo?: number;
    net_vat_kobo?: number;
    vat_transactions?: VATTransaction[];
    // WHT fields
    wht_transactions?: WHTTransaction[];
    total_wht_kobo?: number;
    // CIT fields
    assessable_profit_kobo?: number;
    total_income_kobo?: number;
    allowable_deductions_kobo?: number;
    cit_rate?: number;
    cit_payable_kobo?: number;
}

export interface VATTransaction {
    date: string;
    invoice_number: string;
    customer_name: string;
    customer_tin: string;
    amount_kobo: number;
    vat_kobo: number;
    type: 'output' | 'input';
}

export interface WHTTransaction {
    date: string;
    beneficiary_name: string;
    beneficiary_tin: string;
    transaction_type: string;
    gross_amount_kobo: number;
    wht_rate: number;
    wht_amount_kobo: number;
}

const koboToNaira = (kobo: number) => (kobo / 100).toFixed(2);

export function generateTaxProMaxVATCSV(filing: FilingData): string {
    const header = {
        'Taxpayer Name': filing.taxpayer_name,
        'TIN': filing.tin,
        'Tax Period': `${filing.period_start} to ${filing.period_end}`,
        'Filing Type': 'VAT',
        'Template Version': 'TPM-VAT-2024-v1',
    };

    const outputRows = (filing.vat_transactions || [])
        .filter(t => t.type === 'output')
        .map(t => ({
            'Transaction Date': t.date,
            'Invoice Number': t.invoice_number,
            'Customer/Supplier Name': t.customer_name,
            'Customer/Supplier TIN': t.customer_tin,
            'Transaction Type': 'OUTPUT',
            'Taxable Amount (₦)': koboToNaira(t.amount_kobo),
            'VAT Amount (₦)': koboToNaira(t.vat_kobo),
        }));

    const inputRows = (filing.vat_transactions || [])
        .filter(t => t.type === 'input')
        .map(t => ({
            'Transaction Date': t.date,
            'Invoice Number': t.invoice_number,
            'Customer/Supplier Name': t.customer_name,
            'Customer/Supplier TIN': t.customer_tin,
            'Transaction Type': 'INPUT',
            'Taxable Amount (₦)': koboToNaira(t.amount_kobo),
            'VAT Amount (₦)': koboToNaira(t.vat_kobo),
        }));

    const allRows = [...outputRows, ...inputRows];

    const summaryRow = {
        'Transaction Date': 'SUMMARY',
        'Invoice Number': '',
        'Customer/Supplier Name': '',
        'Customer/Supplier TIN': '',
        'Transaction Type': 'NET',
        'Taxable Amount (₦)': '',
        'VAT Amount (₦)': koboToNaira(filing.net_vat_kobo || 0),
    };

    return Papa.unparse([...allRows, summaryRow]);
}

export function generateTaxProMaxWHTCSV(filing: FilingData): string {
    const rows = (filing.wht_transactions || []).map(t => ({
        'Transaction Date': t.date,
        'Beneficiary Name': t.beneficiary_name,
        'Beneficiary TIN': t.beneficiary_tin,
        'Transaction Type': t.transaction_type,
        'Gross Amount (₦)': koboToNaira(t.gross_amount_kobo),
        'WHT Rate (%)': (t.wht_rate * 100).toFixed(1),
        'WHT Amount (₦)': koboToNaira(t.wht_amount_kobo),
    }));

    const summaryRow = {
        'Transaction Date': 'TOTAL',
        'Beneficiary Name': '',
        'Beneficiary TIN': '',
        'Transaction Type': '',
        'Gross Amount (₦)': '',
        'WHT Rate (%)': '',
        'WHT Amount (₦)': koboToNaira(filing.total_wht_kobo || 0),
    };

    return Papa.unparse([...rows, summaryRow]);
}

export function generateTaxProMaxCITCSV(filing: FilingData): string {
    const rows = [
        {
            'Field': 'Taxpayer Name',
            'Value': filing.taxpayer_name,
        },
        {
            'Field': 'TIN',
            'Value': filing.tin,
        },
        {
            'Field': 'Assessment Year',
            'Value': `${filing.period_start} to ${filing.period_end}`,
        },
        {
            'Field': 'Total Income (₦)',
            'Value': koboToNaira(filing.total_income_kobo || 0),
        },
        {
            'Field': 'Allowable Deductions (₦)',
            'Value': koboToNaira(filing.allowable_deductions_kobo || 0),
        },
        {
            'Field': 'Assessable Profit (₦)',
            'Value': koboToNaira(filing.assessable_profit_kobo || 0),
        },
        {
            'Field': 'CIT Rate (%)',
            'Value': ((filing.cit_rate || 0) * 100).toFixed(0),
        },
        {
            'Field': 'CIT Payable (₦)',
            'Value': koboToNaira(filing.cit_payable_kobo || 0),
        },
    ];

    return Papa.unparse(rows);
}

export function downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export function validateCSVTemplate(csvContent: string, taxType: 'VAT' | 'WHT' | 'CIT'): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const parsed = Papa.parse(csvContent, { header: true });

    if (parsed.errors.length > 0) {
        errors.push(...parsed.errors.map(e => e.message));
        return { valid: false, errors };
    }

    const requiredFields: Record<string, string[]> = {
        VAT: ['Transaction Date', 'Invoice Number', 'Transaction Type', 'Taxable Amount (₦)', 'VAT Amount (₦)'],
        WHT: ['Transaction Date', 'Beneficiary Name', 'Beneficiary TIN', 'Gross Amount (₦)', 'WHT Amount (₦)'],
        CIT: ['Field', 'Value'],
    };

    const fields = parsed.meta.fields || [];
    for (const required of requiredFields[taxType]) {
        if (!fields.includes(required)) {
            errors.push(`Missing required column: ${required}`);
        }
    }

    return { valid: errors.length === 0, errors };
}
