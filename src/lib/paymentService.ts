/**
 * Payment Service
 * Handles all payment CRUD operations via Supabase RPC and direct queries.
 */

import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/lib/auditLog";
import { stringToKobo, addKobo } from "@/lib/money";

export interface Payment {
  id: string;
  user_id: string;
  filing_id: string;
  amount_kobo: string;
  currency: string;
  payment_method: string | null;
  reference: string | null;
  /**
   * Financial transaction state.
   * "pending"  — awaiting gateway callback or admin review
   * "paid"     — confirmed via gateway callback (Paystack/Flutterwave)
   * "failed"   — gateway or admin rejected
   * "refunded" — reversed
   *
   * NOTE: Manually logged payments created via "Record Manual Payment" stay "pending"
   * until an admin verifies them via the admin_verify_payment RPC. Do NOT transition
   * this to "paid" from the client — that bypasses the verification workflow.
   */
  status: "pending" | "paid" | "failed" | "refunded";
  /**
   * Evidence/receipt verification state (separate from financial state).
   * "pending"  — logged, awaiting admin review
   * "verified" — admin has confirmed the payment evidence
   * "rejected" — admin rejected the payment evidence
   *
   * A payment is considered settled for balance purposes when:
   *   status === "paid"  (gateway confirmed)  OR
   *   verification_status === "verified"  (admin verified a manually logged payment)
   */
  verification_status: "pending" | "verified" | "rejected";
  paid_at: string | null;
  created_at: string;
  archived: boolean;
}

export type PaymentStatus = Payment["status"];

/**
 * Single source of truth for "is this payment confirmed/settled?".
 *
 * A payment counts toward a filing's paid balance when:
 *   - status === "paid"                 → Paystack/Flutterwave gateway confirmed
 *   - verification_status === "verified" → admin verified a manually logged payment
 *
 * Everything else (pending, rejected, failed) does NOT count.
 *
 * Use this function everywhere instead of inlining the rule.
 */
export function isPaymentConfirmed(payment: {
  status: string;
  verification_status?: string | null;
}): boolean {
  return payment.status === "paid" || payment.verification_status === "verified";
}

/**
 * Fetch all payments for the current user.
 */
export async function fetchUserPayments(
  status?: PaymentStatus | "all"
): Promise<Payment[]> {
  let query = supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch payments:", error);
    throw error;
  }

  return (data || []) as unknown as Payment[];
}

/**
 * Fetch payments for a specific filing.
 */
export async function fetchFilingPayments(filingId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("filing_id", filingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch filing payments:", error);
    throw error;
  }

  return (data || []) as unknown as Payment[];
}

/**
 * Fetch a single payment by ID.
 */
export async function fetchPaymentById(paymentId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("Failed to fetch payment:", error);
    throw error;
  }

  return data as unknown as Payment;
}

/**
 * Create a new payment via RPC.
 */
export async function createPayment(params: {
  filingId: string;
  amountKobo: string;
  method: string;
  reference: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("record_payment", {
    p_filing_id: params.filingId,
    p_amount_kobo: params.amountKobo,
    p_method: params.method,
    p_reference: params.reference,
  });

  if (error) {
    console.error("Failed to create payment:", error);
    throw error;
  }

  return data as string;
}

/**
 * Update payment status.
 */
export async function updatePaymentStatus(
  paymentId: string,
  newStatus: PaymentStatus
): Promise<void> {
  const updateData: Record<string, unknown> = { status: newStatus };
  
  if (newStatus === "paid") {
    updateData.paid_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("payments")
    .update(updateData)
    .eq("id", paymentId);

  if (error) {
    console.error("Failed to update payment status:", error);
    throw error;
  }

  // Audit log
  await writeAuditLog({
    action: "payment.updated",
    entity_type: "payment",
    entity_id: paymentId,
    after_json: { status: newStatus },
  });
}

/**
 * Archive a payment.
 */
export async function archivePayment(paymentId: string): Promise<void> {
  const { error } = await supabase
    .from("payments")
    .update({ archived: true })
    .eq("id", paymentId);

  if (error) {
    console.error("Failed to archive payment:", error);
    throw error;
  }

  // Audit log
  await writeAuditLog({
    action: "payment.archived",
    entity_type: "payment",
    entity_id: paymentId,
  });
}

/**
 * Get total confirmed amount for the current user across all filings.
 * Uses the combined rule: status=paid (gateway) OR verification_status=verified (admin).
 */
export async function getTotalPaidAmount(): Promise<bigint> {
  const { data, error } = await supabase
    .from("payments")
    .select("amount_kobo, status, verification_status")
    .or("status.eq.paid,verification_status.eq.verified")
    .eq("archived", false);

  if (error) {
    console.error("Failed to get total confirmed paid:", error);
    throw error;
  }

  let total = 0n;
  for (const payment of data || []) {
    total = addKobo(total, stringToKobo(payment.amount_kobo));
  }

  return total;
}

/**
 * Get total confirmed amount for a specific filing.
 * Uses the combined rule: status=paid (gateway) OR verification_status=verified (admin).
 */
export async function getFilingTotalPaid(filingId: string): Promise<bigint> {
  const { data, error } = await supabase
    .from("payments")
    .select("amount_kobo, status, verification_status")
    .eq("filing_id", filingId)
    .or("status.eq.paid,verification_status.eq.verified")
    .eq("archived", false);

  if (error) {
    console.error("Failed to get filing confirmed paid:", error);
    throw error;
  }

  let total = 0n;
  for (const payment of data || []) {
    total = addKobo(total, stringToKobo(payment.amount_kobo));
  }

  return total;
}
