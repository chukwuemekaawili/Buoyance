// Invoice Generator Service
// Creates professional invoices with auto-calculated VAT/WHT

import { supabase } from '@/integrations/supabase/client';

export interface LineItem {
    description: string;
    quantity: number;
    unit_price_kobo: number;
    amount_kobo: number;
}

export interface InvoiceInput {
    client_name: string;
    client_tin?: string;
    client_email?: string;
    client_address?: string;
    issue_date: string;
    due_date?: string;
    line_items: LineItem[];
    vat_rate?: number; // Default 7.5%
    wht_rate?: number; // 0-10% depending on transaction type
    notes?: string;
    currency?: string;
}

export interface Invoice {
    id: string;
    user_id: string;
    invoice_number: string;
    client_name: string;
    client_tin: string | null;
    issue_date: string;
    due_date: string | null;
    subtotal_kobo: number;
    vat_rate: number;
    vat_amount_kobo: number;
    wht_rate: number;
    wht_amount_kobo: number;
    total_amount_kobo: number;
    payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue';
    line_items: LineItem[];
    created_at: string;
}

function generateInvoiceNumber(): string {
    const prefix = 'BUO';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

const koboToNaira = (kobo: number) => (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });

export function calculateInvoiceTotals(lineItems: LineItem[], vatRate: number = 0.075, whtRate: number = 0) {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount_kobo, 0);
    const vatAmount = Math.round(subtotal * vatRate);
    const whtAmount = Math.round(subtotal * whtRate);
    const total = subtotal + vatAmount - whtAmount;

    return {
        subtotal_kobo: subtotal,
        vat_amount_kobo: vatAmount,
        wht_amount_kobo: whtAmount,
        total_amount_kobo: total,
    };
}

export async function createInvoice(userId: string, input: InvoiceInput): Promise<Invoice> {
    const vatRate = input.vat_rate ?? 0.075;
    const whtRate = input.wht_rate ?? 0;

    // Calculate line item amounts
    const lineItems: LineItem[] = input.line_items.map(item => ({
        ...item,
        amount_kobo: item.quantity * item.unit_price_kobo,
    }));

    const totals = calculateInvoiceTotals(lineItems, vatRate, whtRate);

    const { data, error } = await supabase
        .from('invoices')
        .insert({
            user_id: userId,
            invoice_number: generateInvoiceNumber(),
            client_name: input.client_name,
            client_tin: input.client_tin || null,
            issue_date: input.issue_date,
            due_date: input.due_date || null,
            subtotal_kobo: totals.subtotal_kobo,
            vat_rate: vatRate,
            vat_amount_kobo: totals.vat_amount_kobo,
            wht_rate: whtRate,
            wht_amount_kobo: totals.wht_amount_kobo,
            total_amount_kobo: totals.total_amount_kobo,
            payment_status: 'unpaid',
            line_items: lineItems,
        })
        .select()
        .single();

    if (error) throw new Error(`Failed to create invoice: ${error.message}`);
    return data as Invoice;
}

export async function getInvoices(userId: string, status?: string): Promise<Invoice[]> {
    let query = supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('issue_date', { ascending: false });

    if (status) query = query.eq('payment_status', status);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);
    return (data || []) as Invoice[];
}

export async function updatePaymentStatus(
    invoiceId: string,
    status: 'unpaid' | 'partial' | 'paid' | 'overdue'
): Promise<void> {
    const { error } = await supabase
        .from('invoices')
        .update({ payment_status: status })
        .eq('id', invoiceId);

    if (error) throw new Error(`Failed to update status: ${error.message}`);
}

export function getInvoiceSummary(invoices: Invoice[]) {
    const total = invoices.length;
    const unpaid = invoices.filter(i => i.payment_status === 'unpaid' || i.payment_status === 'overdue');
    const paid = invoices.filter(i => i.payment_status === 'paid');

    return {
        total_invoices: total,
        total_unpaid_kobo: unpaid.reduce((s, i) => s + i.total_amount_kobo, 0),
        total_paid_kobo: paid.reduce((s, i) => s + i.total_amount_kobo, 0),
        total_vat_collected_kobo: invoices.reduce((s, i) => s + i.vat_amount_kobo, 0),
        total_wht_deducted_kobo: invoices.reduce((s, i) => s + i.wht_amount_kobo, 0),
        overdue_count: invoices.filter(i => i.payment_status === 'overdue').length,
    };
}

export function formatInvoiceForEmail(invoice: Invoice, companyName: string, companyAddress: string): string {
    return `
INVOICE ${invoice.invoice_number}
${companyName}
${companyAddress}

Bill To: ${invoice.client_name}
${invoice.client_tin ? `TIN: ${invoice.client_tin}` : ''}

Date: ${invoice.issue_date}
${invoice.due_date ? `Due: ${invoice.due_date}` : ''}

ITEMS:
${(invoice.line_items as LineItem[]).map(item =>
        `  ${item.description} - ${item.quantity} x ₦${koboToNaira(item.unit_price_kobo)} = ₦${koboToNaira(item.amount_kobo)}`
    ).join('\n')}

Subtotal: ₦${koboToNaira(invoice.subtotal_kobo)}
VAT (${(invoice.vat_rate * 100).toFixed(1)}%): ₦${koboToNaira(invoice.vat_amount_kobo)}
${invoice.wht_rate > 0 ? `WHT (${(invoice.wht_rate * 100).toFixed(1)}%): -₦${koboToNaira(invoice.wht_amount_kobo)}` : ''}
TOTAL: ₦${koboToNaira(invoice.total_amount_kobo)}
`.trim();
}
