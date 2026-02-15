// Smart Transaction Categorization Engine
// Keyword-based + pattern-based auto-categorization for Nigerian transactions

export interface CategorySuggestion {
    category: string;
    subcategory?: string;
    confidence: number;
    tax_deductible: boolean;
    vat_applicable: boolean;
    rule_matched: string;
}

interface CategoryRule {
    keywords: string[];
    category: string;
    subcategory?: string;
    tax_deductible: boolean;
    vat_applicable: boolean;
}

const CATEGORY_RULES: CategoryRule[] = [
    // Income Categories
    { keywords: ['salary', 'wage', 'payroll', 'monthly pay', 'pay slip'], category: 'Salary Income', tax_deductible: false, vat_applicable: false },
    { keywords: ['freelance', 'contract payment', 'consulting fee', 'professional fee'], category: 'Professional Income', tax_deductible: false, vat_applicable: true },
    { keywords: ['dividend', 'div payment'], category: 'Investment Income', subcategory: 'Dividends', tax_deductible: false, vat_applicable: false },
    { keywords: ['interest earned', 'interest income', 'savings interest'], category: 'Investment Income', subcategory: 'Interest', tax_deductible: false, vat_applicable: false },
    { keywords: ['rent received', 'rental income', 'tenant'], category: 'Rental Income', tax_deductible: false, vat_applicable: false },
    { keywords: ['commission', 'bonus', 'incentive'], category: 'Other Income', subcategory: 'Commission', tax_deductible: false, vat_applicable: false },

    // Transportation
    { keywords: ['uber', 'bolt', 'taxify', 'indrive', 'taxi', 'cab'], category: 'Transportation', subcategory: 'Ride-hailing', tax_deductible: true, vat_applicable: false },
    { keywords: ['fuel', 'petrol', 'diesel', 'filling station', 'nnpc', 'total', 'oando'], category: 'Transportation', subcategory: 'Fuel', tax_deductible: true, vat_applicable: true },
    { keywords: ['toll', 'lcc', 'lekki toll'], category: 'Transportation', subcategory: 'Tolls', tax_deductible: true, vat_applicable: false },
    { keywords: ['parking', 'car park'], category: 'Transportation', subcategory: 'Parking', tax_deductible: true, vat_applicable: true },

    // Utilities & Telecoms
    { keywords: ['mtn', 'airtel', 'glo', '9mobile', 'etisalat', 'airtime', 'data bundle', 'recharge'], category: 'Telecommunications', tax_deductible: true, vat_applicable: true },
    { keywords: ['nepa', 'phcn', 'ekedc', 'ikedc', 'aedc', 'bedc', 'electricity', 'power', 'prepaid meter'], category: 'Utilities', subcategory: 'Electricity', tax_deductible: true, vat_applicable: true },
    { keywords: ['water bill', 'water rate', 'lwc'], category: 'Utilities', subcategory: 'Water', tax_deductible: true, vat_applicable: false },
    { keywords: ['dstv', 'gotv', 'startimes', 'netflix', 'showmax', 'cable tv'], category: 'Utilities', subcategory: 'Entertainment', tax_deductible: false, vat_applicable: true },
    { keywords: ['internet', 'wifi', 'broadband', 'spectranet', 'swift', 'ipnx'], category: 'Utilities', subcategory: 'Internet', tax_deductible: true, vat_applicable: true },

    // Food & Dining
    { keywords: ['shoprite', 'spar', 'next cash', 'justrite', 'market', 'grocery', 'foodstuff'], category: 'Food & Groceries', tax_deductible: false, vat_applicable: true },
    { keywords: ['restaurant', 'eatery', 'bukka', 'suya', 'food', 'lunch', 'dinner', 'chicken republic', 'kfc', 'dominos'], category: 'Meals & Entertainment', tax_deductible: true, vat_applicable: true },

    // Rent & Housing
    { keywords: ['rent', 'house rent', 'apartment rent', 'landlord', 'lease payment'], category: 'Rent', tax_deductible: true, vat_applicable: false },
    { keywords: ['service charge', 'estate dues', 'maintenance fee'], category: 'Housing', subcategory: 'Service Charge', tax_deductible: true, vat_applicable: true },

    // Office & Business
    { keywords: ['office supplies', 'stationery', 'printer', 'toner', 'paper'], category: 'Office Expenses', subcategory: 'Supplies', tax_deductible: true, vat_applicable: true },
    { keywords: ['software', 'subscription', 'saas', 'license', 'microsoft', 'google workspace', 'zoom'], category: 'Office Expenses', subcategory: 'Software', tax_deductible: true, vat_applicable: true },
    { keywords: ['laptop', 'computer', 'phone', 'samsung', 'apple', 'iphone'], category: 'Equipment', tax_deductible: true, vat_applicable: true },

    // Financial
    { keywords: ['bank charge', 'sms alert', 'maintenance fee', 'stamp duty', 'cot'], category: 'Bank Charges', tax_deductible: true, vat_applicable: false },
    { keywords: ['insurance', 'hmo', 'health plan', 'life insurance', 'car insurance'], category: 'Insurance', tax_deductible: true, vat_applicable: false },
    { keywords: ['loan repayment', 'credit', 'mortgage'], category: 'Loan Repayment', tax_deductible: false, vat_applicable: false },

    // Tax Payments
    { keywords: ['firs', 'tax payment', 'paye', 'withholding tax', 'vat payment', 'cit payment'], category: 'Tax Payments', tax_deductible: false, vat_applicable: false },
    { keywords: ['lirs', 'state tax', 'development levy'], category: 'Tax Payments', subcategory: 'State Tax', tax_deductible: false, vat_applicable: false },
    { keywords: ['pension', 'pencom', 'pfa', 'rsa'], category: 'Pension', tax_deductible: true, vat_applicable: false },
    { keywords: ['nhf', 'national housing fund'], category: 'NHF', tax_deductible: true, vat_applicable: false },

    // Professional Services
    { keywords: ['legal fee', 'lawyer', 'solicitor', 'barrister', 'law firm'], category: 'Professional Services', subcategory: 'Legal', tax_deductible: true, vat_applicable: true },
    { keywords: ['accounting fee', 'audit fee', 'accountant', 'bookkeeper'], category: 'Professional Services', subcategory: 'Accounting', tax_deductible: true, vat_applicable: true },
    { keywords: ['consulting', 'advisory', 'consultant'], category: 'Professional Services', subcategory: 'Consulting', tax_deductible: true, vat_applicable: true },

    // Transfers
    { keywords: ['transfer to', 'nip', 'transfer', 'trf'], category: 'Transfer Out', tax_deductible: false, vat_applicable: false },
    { keywords: ['transfer from', 'inflow', 'received'], category: 'Transfer In', tax_deductible: false, vat_applicable: false },

    // Withdrawals
    { keywords: ['atm', 'withdrawal', 'pos', 'cash withdrawal'], category: 'Cash Withdrawal', tax_deductible: false, vat_applicable: false },
];

export function categorizeTransaction(description: string, amount_kobo: number, isDebit: boolean): CategorySuggestion {
    const descLower = description.toLowerCase();

    // Check each rule
    for (const rule of CATEGORY_RULES) {
        for (const keyword of rule.keywords) {
            if (descLower.includes(keyword.toLowerCase())) {
                return {
                    category: rule.category,
                    subcategory: rule.subcategory,
                    confidence: 0.85,
                    tax_deductible: rule.tax_deductible,
                    vat_applicable: rule.vat_applicable,
                    rule_matched: keyword,
                };
            }
        }
    }

    // Fallback: Amount-based heuristics
    if (!isDebit && amount_kobo > 10000000) { // > ₦100K credit
        return {
            category: 'Income',
            confidence: 0.3,
            tax_deductible: false,
            vat_applicable: false,
            rule_matched: 'amount_heuristic',
        };
    }

    return {
        category: 'Uncategorized',
        confidence: 0.1,
        tax_deductible: false,
        vat_applicable: false,
        rule_matched: 'none',
    };
}

export function bulkCategorize(transactions: Array<{ description: string; amount_kobo: number; debit_credit: string }>): CategorySuggestion[] {
    return transactions.map(txn =>
        categorizeTransaction(txn.description, txn.amount_kobo, txn.debit_credit === 'debit')
    );
}

export function getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
        'Salary Income': '💰',
        'Professional Income': '💼',
        'Investment Income': '📈',
        'Rental Income': '🏠',
        'Transportation': '🚗',
        'Telecommunications': '📱',
        'Utilities': '⚡',
        'Food & Groceries': '🛒',
        'Meals & Entertainment': '🍽️',
        'Rent': '🏘️',
        'Office Expenses': '🖊️',
        'Equipment': '💻',
        'Bank Charges': '🏦',
        'Insurance': '🛡️',
        'Tax Payments': '🏛️',
        'Pension': '🧓',
        'Professional Services': '👔',
        'Transfer Out': '↗️',
        'Transfer In': '↙️',
        'Cash Withdrawal': '💵',
        'Uncategorized': '❓',
    };
    return icons[category] || '📋';
}

export function getAllCategories(): string[] {
    const cats = new Set(CATEGORY_RULES.map(r => r.category));
    return Array.from(cats).sort();
}
