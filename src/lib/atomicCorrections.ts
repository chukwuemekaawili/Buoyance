/**
 * Atomic Correction Service
 * 
 * Uses database RPC functions for atomic (transactional) corrections.
 * Ensures that insert + update operations are atomic and cannot leave
 * partial state if one step fails.
 */

import { supabase } from "@/integrations/supabase/client";

export interface AtomicCorrectionResult {
  success: boolean;
  new_id?: string;
  superseded_id?: string;
  error?: string;
}

/**
 * Atomically correct an income record.
 * Creates a new record and marks the original as superseded in a single transaction.
 */
export async function correctIncomeAtomic(
  originalId: string,
  correctedData: {
    amount_kobo: string;
    source: string;
    date: string;
    category?: string | null;
    description?: string | null;
    vatable?: boolean;
    output_vat_kobo?: string | null;
    wht_deducted?: boolean;
    wht_credit_kobo?: number;
    tax_exempt?: boolean;
  }
): Promise<AtomicCorrectionResult> {
  try {
    const { data, error } = await supabase.rpc("correct_income_atomic", {
      p_original_id: originalId,
      p_amount_kobo: correctedData.amount_kobo,
      p_source: correctedData.source,
      p_date: correctedData.date,
      p_category: correctedData.category || null,
      p_description: correctedData.description || null,
      p_vatable: correctedData.vatable ?? false,
      p_output_vat_kobo: correctedData.output_vat_kobo || null,
      p_wht_deducted: correctedData.wht_deducted ?? false,
      p_wht_credit_kobo: correctedData.wht_credit_kobo ?? 0,
      p_tax_exempt: correctedData.tax_exempt ?? false,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; new_id: string; superseded_id: string };
    return {
      success: result.success,
      new_id: result.new_id,
      superseded_id: result.superseded_id,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Atomically correct an expense record.
 */
export async function correctExpenseAtomic(
  originalId: string,
  correctedData: {
    amount_kobo: string;
    category: string;
    description: string;
    date: string;
    vatable?: boolean;
    input_vat_kobo?: string | null;
    deductible?: boolean;
    invoice_ref?: string | null;
  }
): Promise<AtomicCorrectionResult> {
  try {
    const { data, error } = await supabase.rpc("correct_expense_atomic", {
      p_original_id: originalId,
      p_amount_kobo: correctedData.amount_kobo,
      p_category: correctedData.category,
      p_description: correctedData.description,
      p_date: correctedData.date,
      p_vatable: correctedData.vatable ?? false,
      p_input_vat_kobo: correctedData.input_vat_kobo || null,
      p_deductible: correctedData.deductible ?? false,
      p_invoice_ref: correctedData.invoice_ref || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; new_id: string; superseded_id: string };
    return {
      success: result.success,
      new_id: result.new_id,
      superseded_id: result.superseded_id,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Atomically finalize a calculation.
 * Sets finalized=true, finalized_at=NOW(), and status='finalized'.
 */
export async function finalizeCalculationAtomic(
  calculationId: string
): Promise<{ success: boolean; finalized_at?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("finalize_calculation_atomic", {
      p_calculation_id: calculationId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; calculation_id: string; finalized_at: string };
    return {
      success: result.success,
      finalized_at: result.finalized_at,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
