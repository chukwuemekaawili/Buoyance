// Bank Statement & CSV Parser
// Supports GTBank, Access, UBA, and generic CSV/Excel formats

import Papa from 'papaparse';

export interface ParsedTransaction {
    date: string;
    description: string;
    amount_kobo: number;
    debit_credit: 'debit' | 'credit';
    balance_kobo?: number;
    reference?: string;
    raw_data: Record<string, string>;
}

export interface ParseResult {
    transactions: ParsedTransaction[];
    bank_detected: string;
    total_debits_kobo: number;
    total_credits_kobo: number;
    date_range: { from: string; to: string };
    errors: string[];
}

// Bank-specific column mappings
const BANK_MAPPINGS: Record<string, {
    date: string[];
    description: string[];
    debit: string[];
    credit: string[];
    balance: string[];
    reference: string[];
}> = {
    gtbank: {
        date: ['Transaction Date', 'Date', 'Txn Date', 'Trans Date'],
        description: ['Description', 'Narration', 'Remarks', 'Details'],
        debit: ['Debit', 'Debit Amount', 'Withdrawals', 'DR'],
        credit: ['Credit', 'Credit Amount', 'Deposits', 'CR'],
        balance: ['Balance', 'Closing Balance', 'Running Balance'],
        reference: ['Reference', 'Ref', 'Reference No'],
    },
    access: {
        date: ['Date', 'Transaction Date', 'Value Date'],
        description: ['Narration', 'Description', 'Particulars'],
        debit: ['Debit', 'DR', 'Withdrawals'],
        credit: ['Credit', 'CR', 'Deposits'],
        balance: ['Balance', 'Ledger Balance'],
        reference: ['Reference', 'Trans Ref'],
    },
    uba: {
        date: ['Date', 'Transaction Date', 'Posted Date'],
        description: ['Description', 'Narration', 'Transaction Details'],
        debit: ['Debit', 'Withdrawal', 'DR'],
        credit: ['Credit', 'Deposit', 'CR'],
        balance: ['Balance', 'Available Balance'],
        reference: ['Reference No', 'Reference', 'Serial'],
    },
    generic: {
        date: ['Date', 'Transaction Date', 'Txn Date', 'Value Date', 'Posted Date'],
        description: ['Description', 'Narration', 'Details', 'Particulars', 'Remarks', 'Memo'],
        debit: ['Debit', 'DR', 'Withdrawals', 'Debit Amount', 'Amount Debited'],
        credit: ['Credit', 'CR', 'Deposits', 'Credit Amount', 'Amount Credited'],
        balance: ['Balance', 'Closing Balance', 'Running Balance', 'Available Balance', 'Ledger Balance'],
        reference: ['Reference', 'Ref', 'Reference No', 'Trans Ref', 'Serial'],
    },
};

function parseAmount(value: string | null | undefined): number {
    if (!value || value.trim() === '' || value === '-') return 0;
    const cleaned = value.replace(/[₦N,\s]/g, '').replace(/[()]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(Math.abs(num) * 100); // to kobo
}

function parseDate(value: string): string {
    if (!value) return '';

    // Try various date formats
    const formats = [
        // DD/MM/YYYY
        /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
        // YYYY-MM-DD
        /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
        // DD-Mon-YYYY
        /^(\d{1,2})[\/\-](\w{3})[\/\-](\d{4})$/,
    ];

    const trimmed = value.trim();

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = trimmed.match(formats[0]);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;

    // YYYY-MM-DD
    const ymd = trimmed.match(formats[1]);
    if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;

    // Try native Date parsing as fallback
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }

    return trimmed;
}

function findColumn(headers: string[], candidates: string[]): string | null {
    for (const candidate of candidates) {
        const found = headers.find(h => h.toLowerCase().trim() === candidate.toLowerCase().trim());
        if (found) return found;
    }
    // Partial match fallback
    for (const candidate of candidates) {
        const found = headers.find(h => h.toLowerCase().includes(candidate.toLowerCase()));
        if (found) return found;
    }
    return null;
}

function detectBank(headers: string[]): string {
    const headerStr = headers.join(' ').toLowerCase();

    if (headerStr.includes('narration') && headerStr.includes('reference')) return 'access';
    if (headerStr.includes('trans date') || headerStr.includes('txn date')) return 'gtbank';
    if (headerStr.includes('posted date') || headerStr.includes('serial')) return 'uba';
    return 'generic';
}

export function parseCSVStatement(csvContent: string): ParseResult {
    const errors: string[] = [];

    const { data, meta } = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim(),
    });

    const headers = meta.fields || [];
    const bank = detectBank(headers);
    const mapping = BANK_MAPPINGS[bank] || BANK_MAPPINGS.generic;

    // Resolve column names
    const dateCol = findColumn(headers, mapping.date);
    const descCol = findColumn(headers, mapping.description);
    const debitCol = findColumn(headers, mapping.debit);
    const creditCol = findColumn(headers, mapping.credit);
    const balanceCol = findColumn(headers, mapping.balance);
    const refCol = findColumn(headers, mapping.reference);

    if (!dateCol) errors.push('Could not find Date column');
    if (!descCol) errors.push('Could not find Description column');
    if (!debitCol && !creditCol) errors.push('Could not find Debit or Credit columns');

    const transactions: ParsedTransaction[] = [];
    let totalDebits = 0;
    let totalCredits = 0;
    let minDate = '';
    let maxDate = '';

    for (const row of data as Record<string, string>[]) {
        const date = dateCol ? parseDate(row[dateCol]) : '';
        const description = descCol ? (row[descCol] || '').trim() : '';
        const debitAmount = debitCol ? parseAmount(row[debitCol]) : 0;
        const creditAmount = creditCol ? parseAmount(row[creditCol]) : 0;
        const balance = balanceCol ? parseAmount(row[balanceCol]) : undefined;
        const reference = refCol ? (row[refCol] || '').trim() : undefined;

        // Skip header rows or empty rows
        if (!date && !description) continue;
        if (!debitAmount && !creditAmount) continue;

        const isDebit = debitAmount > 0;
        const amount = isDebit ? debitAmount : creditAmount;

        if (isDebit) totalDebits += amount;
        else totalCredits += amount;

        if (!minDate || date < minDate) minDate = date;
        if (!maxDate || date > maxDate) maxDate = date;

        transactions.push({
            date,
            description,
            amount_kobo: amount,
            debit_credit: isDebit ? 'debit' : 'credit',
            balance_kobo: balance,
            reference,
            raw_data: row,
        });
    }

    return {
        transactions,
        bank_detected: bank,
        total_debits_kobo: totalDebits,
        total_credits_kobo: totalCredits,
        date_range: { from: minDate, to: maxDate },
        errors,
    };
}

export async function parseStatementFile(file: File): Promise<ParseResult> {
    const text = await file.text();

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        return parseCSVStatement(text);
    }

    // For Excel files, use the xlsx package already in the project
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const { default: XLSX } = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        return parseCSVStatement(csv);
    }

    return {
        transactions: [],
        bank_detected: 'unknown',
        total_debits_kobo: 0,
        total_credits_kobo: 0,
        date_range: { from: '', to: '' },
        errors: [`Unsupported file format: ${file.name}. Please use CSV or Excel files.`],
    };
}
