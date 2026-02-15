// DIN (Demand Identification Number) Tracking Service
// Manages the DIN → Payment → Receipt → Evidence chain

import { supabase } from '@/integrations/supabase/client';

export type SubmissionStatus = 'draft' | 'exported' | 'submitted' | 'paid' | 'reconciled';

export interface DINRecord {
    filing_id: string;
    din: string;
    submission_status: SubmissionStatus;
    submitted_at: string | null;
    portal_type: 'taxpromax' | 'lirs' | 'other';
}

export async function saveDIN(filingId: string, din: string, portalType: string = 'taxpromax') {
    const { data, error } = await supabase
        .from('filings')
        .update({
            din,
            submission_status: 'submitted',
            submitted_at: new Date().toISOString(),
            portal_type: portalType,
        })
        .eq('id', filingId)
        .select()
        .single();

    if (error) throw new Error(`Failed to save DIN: ${error.message}`);
    return data;
}

export async function updateSubmissionStatus(filingId: string, status: SubmissionStatus) {
    const { data, error } = await supabase
        .from('filings')
        .update({ submission_status: status })
        .eq('id', filingId)
        .select()
        .single();

    if (error) throw new Error(`Failed to update status: ${error.message}`);
    return data;
}

export async function markAsExported(filingId: string, templateVersion: string = 'TPM-2024-v1') {
    return supabase
        .from('filings')
        .update({
            submission_status: 'exported',
            template_version: templateVersion,
        })
        .eq('id', filingId);
}

export async function linkPaymentToFiling(filingId: string, paymentId: string, din: string) {
    const { error } = await supabase
        .from('payments')
        .update({ filing_id: filingId, din })
        .eq('id', paymentId);

    if (error) throw new Error(`Failed to link payment: ${error.message}`);

    // Update filing status to 'paid'
    await updateSubmissionStatus(filingId, 'paid');
}

export async function reconcileFiling(filingId: string, receiptUrl?: string) {
    const updateData: Record<string, unknown> = {
        submission_status: 'reconciled',
    };

    if (receiptUrl) {
        updateData.receipt_url = receiptUrl;
    }

    const { data, error } = await supabase
        .from('filings')
        .update(updateData)
        .eq('id', filingId)
        .select()
        .single();

    if (error) throw new Error(`Failed to reconcile: ${error.message}`);
    return data;
}

export async function getFilingsByStatus(userId: string, status?: SubmissionStatus) {
    let query = supabase
        .from('filings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (status) {
        query = query.eq('submission_status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch filings: ${error.message}`);
    return data || [];
}

export async function getDINDetails(din: string) {
    const { data: filing } = await supabase
        .from('filings')
        .select('*')
        .eq('din', din)
        .single();

    const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('din', din);

    return {
        filing,
        payments: payments || [],
        isReconciled: filing?.submission_status === 'reconciled',
    };
}

export function getStatusColor(status: SubmissionStatus): string {
    const colors: Record<SubmissionStatus, string> = {
        draft: 'gray',
        exported: 'blue',
        submitted: 'yellow',
        paid: 'orange',
        reconciled: 'green',
    };
    return colors[status] || 'gray';
}

export function getStatusLabel(status: SubmissionStatus): string {
    const labels: Record<SubmissionStatus, string> = {
        draft: 'Draft',
        exported: 'Exported (CSV Ready)',
        submitted: 'Submitted to Portal',
        paid: 'Payment Made',
        reconciled: 'Reconciled ✅',
    };
    return labels[status] || status;
}
