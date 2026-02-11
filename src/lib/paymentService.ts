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
  status: "pending" | "paid" | "failed" | "refunded";
  paid_at: string | null;
  created_at: string;
  archived: boolean;
}

export type PaymentStatus = Payment["status"];

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
 * Get total paid amount for user (sum of all paid payments).
 */
export async function getTotalPaidAmount(): Promise<bigint> {
  const { data, error } = await supabase
    .from("payments")
    .select("amount_kobo")
    .eq("status", "paid");

  if (error) {
    console.error("Failed to get total paid:", error);
    throw error;
  }

  let total = 0n;
  for (const payment of data || []) {
    total = addKobo(total, stringToKobo(payment.amount_kobo));
  }

  return total;
}

/**
 * Get total paid for a specific filing.
 */
export async function getFilingTotalPaid(filingId: string): Promise<bigint> {
  const { data, error } = await supabase
    .from("payments")
    .select("amount_kobo")
    .eq("filing_id", filingId)
    .eq("status", "paid");

  if (error) {
    console.error("Failed to get filing total paid:", error);
    throw error;
  }

  let total = 0n;
  for (const payment of data || []) {
    total = addKobo(total, stringToKobo(payment.amount_kobo));
  }

  return total;
}
