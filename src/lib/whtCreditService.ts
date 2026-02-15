// WHT Credit Ledger Management Service
// Tracks available, applied, and expiring WHT credits

import { supabase } from '@/integrations/supabase/client';

export interface WHTCreditEntry {
    id: string;
    user_id: string;
    certificate_id: string;
    tax_year: number;
    credit_amount_kobo: number;
    applied_amount_kobo: number;
    remaining_amount_kobo: number;
    expires_at: string | null;
    status: 'available' | 'partially_applied' | 'fully_applied' | 'expired';
    created_at: string;
}

export interface CreditSummary {
    total_available_kobo: number;
    total_applied_kobo: number;
    total_expired_kobo: number;
    by_year: Record<number, {
        available: number;
        applied: number;
        expiring_soon: number;
    }>;
}

export async function createCreditFromCertificate(
    userId: string,
    certificateId: string,
    amountKobo: number,
    taxYear: number
): Promise<WHTCreditEntry> {
    // WHT credits expire 6 years after the year of assessment
    const expiresAt = new Date(taxYear + 6, 11, 31).toISOString();

    const { data, error } = await supabase
        .from('wht_credit_ledger')
        .insert({
            user_id: userId,
            certificate_id: certificateId,
            tax_year: taxYear,
            credit_amount_kobo: amountKobo,
            applied_amount_kobo: 0,
            remaining_amount_kobo: amountKobo,
            expires_at: expiresAt,
            status: 'available',
        })
        .select()
        .single();

    if (error) throw new Error(`Failed to create credit: ${error.message}`);
    return data as WHTCreditEntry;
}

export async function getAvailableCredits(userId: string, taxYear?: number): Promise<WHTCreditEntry[]> {
    let query = supabase
        .from('wht_credit_ledger')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['available', 'partially_applied'])
        .order('tax_year', { ascending: true });

    if (taxYear) {
        query = query.eq('tax_year', taxYear);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch credits: ${error.message}`);
    return (data || []) as WHTCreditEntry[];
}

export async function getTotalAvailableCredit(userId: string): Promise<number> {
    const credits = await getAvailableCredits(userId);
    return credits.reduce((sum, c) => sum + c.remaining_amount_kobo, 0);
}

export async function applyCreditToFiling(
    creditId: string,
    amountToApply: number
): Promise<WHTCreditEntry> {
    // Get current credit
    const { data: credit, error: fetchError } = await supabase
        .from('wht_credit_ledger')
        .select('*')
        .eq('id', creditId)
        .single();

    if (fetchError || !credit) throw new Error('Credit not found');

    const currentRemaining = credit.remaining_amount_kobo;
    if (amountToApply > currentRemaining) {
        throw new Error(`Cannot apply ₦${(amountToApply / 100).toFixed(2)}. Only ₦${(currentRemaining / 100).toFixed(2)} available.`);
    }

    const newApplied = credit.applied_amount_kobo + amountToApply;
    const newRemaining = credit.credit_amount_kobo - newApplied;
    const newStatus = newRemaining === 0 ? 'fully_applied' : 'partially_applied';

    const { data, error } = await supabase
        .from('wht_credit_ledger')
        .update({
            applied_amount_kobo: newApplied,
            remaining_amount_kobo: newRemaining,
            status: newStatus,
        })
        .eq('id', creditId)
        .select()
        .single();

    if (error) throw new Error(`Failed to apply credit: ${error.message}`);
    return data as WHTCreditEntry;
}

export async function getCreditSummary(userId: string): Promise<CreditSummary> {
    const { data: credits, error } = await supabase
        .from('wht_credit_ledger')
        .select('*')
        .eq('user_id', userId);

    if (error) throw new Error(`Failed to fetch credits: ${error.message}`);

    const summary: CreditSummary = {
        total_available_kobo: 0,
        total_applied_kobo: 0,
        total_expired_kobo: 0,
        by_year: {},
    };

    const now = new Date();
    const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    for (const credit of (credits || [])) {
        const year = credit.tax_year;
        if (!summary.by_year[year]) {
            summary.by_year[year] = { available: 0, applied: 0, expiring_soon: 0 };
        }

        if (credit.status === 'expired' || (credit.expires_at && new Date(credit.expires_at) < now)) {
            summary.total_expired_kobo += credit.remaining_amount_kobo;
        } else {
            summary.total_available_kobo += credit.remaining_amount_kobo;
            summary.by_year[year].available += credit.remaining_amount_kobo;

            // Check expiring soon
            if (credit.expires_at && new Date(credit.expires_at) < threeMonths) {
                summary.by_year[year].expiring_soon += credit.remaining_amount_kobo;
            }
        }

        summary.total_applied_kobo += credit.applied_amount_kobo;
        summary.by_year[year].applied += credit.applied_amount_kobo;
    }

    return summary;
}

export async function uploadWHTCertificate(
    userId: string,
    file: File,
    certificateData: Partial<{
        issuer_name: string;
        issuer_tin: string;
        beneficiary_tin: string;
        amount_kobo: number;
        wht_rate: number;
        certificate_number: string;
        issue_date: string;
        tax_year: number;
        ocr_confidence: number;
    }>
) {
    // Upload file to storage
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from('wht-certificates')
        .upload(fileName, file);

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage
        .from('wht-certificates')
        .getPublicUrl(fileName);

    // Create certificate record
    const { data: cert, error: insertError } = await supabase
        .from('wht_certificates')
        .insert({
            user_id: userId,
            document_url: urlData.publicUrl,
            status: 'pending',
            ...certificateData,
        })
        .select()
        .single();

    if (insertError) throw new Error(`Failed to save certificate: ${insertError.message}`);

    // Auto-create credit ledger entry if we have amount and year
    if (certificateData.amount_kobo && certificateData.tax_year) {
        await createCreditFromCertificate(
            userId,
            cert.id,
            certificateData.amount_kobo,
            certificateData.tax_year
        );
    }

    return cert;
}

export function formatCredit(kobo: number): string {
    return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}
