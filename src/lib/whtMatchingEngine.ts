// WHT Certificate Matching Engine
// Fuzzy matches WHT certificates to invoices/transactions for auto-reconciliation

export interface WHTCertificate {
    id: string;
    issuer_name: string | null;
    issuer_tin: string | null;
    amount_kobo: number;
    wht_rate: number | null;
    issue_date: string | null;
    tax_year: number | null;
}

export interface TransactionForMatch {
    id: string;
    description: string;
    amount_kobo: number;
    date: string;
    contact_name?: string;
    contact_tin?: string;
}

export interface MatchResult {
    transaction: TransactionForMatch;
    score: number;
    reasons: string[];
}

// Levenshtein distance for fuzzy string matching
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function fuzzyMatch(a: string | null, b: string | null): number {
    if (!a || !b) return 0;
    const sa = a.toLowerCase().trim();
    const sb = b.toLowerCase().trim();
    if (sa === sb) return 1;
    if (sa.includes(sb) || sb.includes(sa)) return 0.9;

    const maxLen = Math.max(sa.length, sb.length);
    if (maxLen === 0) return 1;
    const distance = levenshteinDistance(sa, sb);
    return 1 - distance / maxLen;
}

function daysBetween(date1: string | null, date2: string | null): number {
    if (!date1 || !date2) return Infinity;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs(Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)));
}

export function calculateMatchScore(cert: WHTCertificate, txn: TransactionForMatch): MatchResult {
    let score = 0;
    const reasons: string[] = [];

    // 1. TIN exact match (strongest signal) - 35 points
    if (cert.issuer_tin && txn.contact_tin && cert.issuer_tin === txn.contact_tin) {
        score += 0.35;
        reasons.push('TIN match');
    }

    // 2. Amount match within 10% tolerance - 30 points
    if (cert.amount_kobo > 0 && txn.amount_kobo > 0) {
        const certGross = cert.wht_rate ? cert.amount_kobo / cert.wht_rate : cert.amount_kobo;
        const amountDiff = Math.abs(certGross - txn.amount_kobo) / txn.amount_kobo;

        if (amountDiff < 0.01) {
            score += 0.30;
            reasons.push('Exact amount match');
        } else if (amountDiff < 0.05) {
            score += 0.25;
            reasons.push('Amount within 5%');
        } else if (amountDiff < 0.10) {
            score += 0.15;
            reasons.push('Amount within 10%');
        }
    }

    // 3. Date proximity - 20 points
    const days = daysBetween(cert.issue_date, txn.date);
    if (days < 7) {
        score += 0.20;
        reasons.push('Date within 7 days');
    } else if (days < 30) {
        score += 0.15;
        reasons.push('Date within 30 days');
    } else if (days < 90) {
        score += 0.05;
        reasons.push('Date within 90 days');
    }

    // 4. Name fuzzy match - 15 points
    const nameScore = Math.max(
        fuzzyMatch(cert.issuer_name, txn.contact_name || null),
        fuzzyMatch(cert.issuer_name, txn.description)
    );
    if (nameScore > 0.8) {
        score += 0.15;
        reasons.push('Name match');
    } else if (nameScore > 0.5) {
        score += 0.08;
        reasons.push('Partial name match');
    }

    return { transaction: txn, score, reasons };
}

export function matchCertificateToTransactions(
    cert: WHTCertificate,
    transactions: TransactionForMatch[],
    minScore: number = 0.5
): MatchResult[] {
    const results: MatchResult[] = [];

    for (const txn of transactions) {
        const result = calculateMatchScore(cert, txn);
        if (result.score >= minScore) {
            results.push(result);
        }
    }

    return results.sort((a, b) => b.score - a.score);
}

export function getBestMatch(
    cert: WHTCertificate,
    transactions: TransactionForMatch[]
): MatchResult | null {
    const matches = matchCertificateToTransactions(cert, transactions, 0.6);
    return matches.length > 0 ? matches[0] : null;
}

export function getMatchConfidenceLabel(score: number): { label: string; color: string } {
    if (score >= 0.8) return { label: 'High Confidence', color: 'green' };
    if (score >= 0.6) return { label: 'Medium Confidence', color: 'yellow' };
    if (score >= 0.4) return { label: 'Low Confidence', color: 'orange' };
    return { label: 'No Match', color: 'red' };
}
