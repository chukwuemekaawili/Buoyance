/**
 * Correction Service
 * 
 * Implements PRD-compliant immutable correction workflow.
 * Records are never deleted - corrections create new records linked via supersedes_id.
 * Historical data remains accessible for audit and compliance.
 */

import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/lib/auditLog";
import type { Json } from "@/integrations/supabase/types";

export type RecordStatus = "active" | "superseded" | "corrected" | "archived";

export interface CorrectionResult {
  success: boolean;
  newRecordId?: string;
  error?: string;
}

/**
 * Create a corrected income record, marking the original as superseded.
 * The original record remains in the database for audit trail.
 */
export async function correctIncome(
  originalId: string,
  correctedData: {
    amount_kobo: string;
    source: string;
    date: string;
    category?: string;
    description?: string;
    vatable: boolean;
    output_vat_kobo?: string;
    wht_deducted: boolean;
    wht_credit_kobo?: number;
    tax_exempt: boolean;
  }
): Promise<CorrectionResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Fetch original record for audit
    const { data: original, error: fetchError } = await supabase
      .from("incomes")
      .select("*")
      .eq("id", originalId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !original) {
      return { success: false, error: "Original record not found" };
    }

    if (original.status === "superseded" || original.status === "corrected") {
      return { success: false, error: "Cannot correct an already superseded record" };
    }

    // Create new corrected record
    const { data: newRecord, error: insertError } = await supabase
      .from("incomes")
      .insert({
        user_id: user.id,
        supersedes_id: originalId,
        status: "active",
        archived: false,
        ...correctedData,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Mark original as superseded
    const { error: updateError } = await supabase
      .from("incomes")
      .update({ status: "superseded" })
      .eq("id", originalId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Audit log
    await writeAuditLog({
      action: "income.corrected",
      entity_type: "income",
      entity_id: newRecord.id,
      before_json: original as unknown as Json,
      after_json: newRecord as unknown as Json,
      metadata: { supersedes_id: originalId },
    });

    return { success: true, newRecordId: newRecord.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Create a corrected expense record, marking the original as superseded.
 */
export async function correctExpense(
  originalId: string,
  correctedData: {
    amount_kobo: string;
    category: string;
    description: string;
    date: string;
    vatable: boolean;
    input_vat_kobo?: string;
    deductible?: boolean;
    invoice_ref?: string;
  }
): Promise<CorrectionResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: original, error: fetchError } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", originalId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !original) {
      return { success: false, error: "Original record not found" };
    }

    if (original.status === "superseded" || original.status === "corrected") {
      return { success: false, error: "Cannot correct an already superseded record" };
    }

    const { data: newRecord, error: insertError } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        supersedes_id: originalId,
        status: "active",
        archived: false,
        ...correctedData,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    await supabase
      .from("expenses")
      .update({ status: "superseded" })
      .eq("id", originalId);

    await writeAuditLog({
      action: "expense.corrected",
      entity_type: "expense",
      entity_id: newRecord.id,
      before_json: original as unknown as Json,
      after_json: newRecord as unknown as Json,
      metadata: { supersedes_id: originalId },
    });

    return { success: true, newRecordId: newRecord.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Create a corrected calculation, marking the original as superseded.
 * Finalized calculations cannot be corrected - they are immutable.
 */
export async function correctCalculation(
  originalId: string,
  correctedData: {
    tax_type: string;
    rule_version: string;
    input_json: Record<string, unknown>;
    output_json: Record<string, unknown>;
    effective_date_used?: string;
    legal_basis_json?: Record<string, unknown>;
  }
): Promise<CorrectionResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: original, error: fetchError } = await supabase
      .from("tax_calculations")
      .select("*")
      .eq("id", originalId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !original) {
      return { success: false, error: "Original calculation not found" };
    }

    if (original.finalized) {
      return { success: false, error: "Finalized calculations are immutable and cannot be corrected" };
    }

    if (original.status === "superseded") {
      return { success: false, error: "Cannot correct a superseded calculation" };
    }

    const { data: newRecord, error: insertError } = await supabase
      .from("tax_calculations")
      .insert([{
        user_id: user.id,
        supersedes_id: originalId,
        status: "draft",
        finalized: false,
        archived: false,
        tax_type: correctedData.tax_type,
        rule_version: correctedData.rule_version,
        input_json: correctedData.input_json as Json,
        output_json: correctedData.output_json as Json,
        effective_date_used: correctedData.effective_date_used,
        legal_basis_json: correctedData.legal_basis_json as Json | undefined,
      }])
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    await supabase
      .from("tax_calculations")
      .update({ status: "superseded" })
      .eq("id", originalId);

    await writeAuditLog({
      action: "calculation.corrected",
      entity_type: "tax_calculation",
      entity_id: newRecord.id,
      before_json: original as unknown as Json,
      after_json: newRecord as unknown as Json,
      metadata: { supersedes_id: originalId },
    });

    return { success: true, newRecordId: newRecord.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Finalize a draft calculation, making it immutable forever.
 * This is a one-way operation that cannot be undone.
 */
export async function finalizeCalculation(calculationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: calc, error: fetchError } = await supabase
      .from("tax_calculations")
      .select("*")
      .eq("id", calculationId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !calc) {
      return { success: false, error: "Calculation not found" };
    }

    if (calc.finalized) {
      return { success: false, error: "Calculation is already finalized" };
    }

    if (calc.status === "superseded" || calc.status === "archived") {
      return { success: false, error: "Cannot finalize a superseded or archived calculation" };
    }

    const { error: updateError } = await supabase
      .from("tax_calculations")
      .update({ 
        finalized: true, 
        status: "finalized" 
      })
      .eq("id", calculationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await writeAuditLog({
      action: "calculation.finalized",
      entity_type: "tax_calculation",
      entity_id: calculationId,
      before_json: { finalized: false, status: calc.status },
      after_json: { finalized: true, status: "finalized" },
      metadata: { 
        tax_type: calc.tax_type, 
        rule_version: calc.rule_version,
        immutable: true 
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get the correction history chain for a record.
 * Returns all records in the supersession chain.
 */
export async function getIncomeHistory(incomeId: string): Promise<any[]> {
  const chain: any[] = [];
  let currentId: string | null = incomeId;

  while (currentId) {
    const { data } = await supabase
      .from("incomes")
      .select("*")
      .eq("id", currentId)
      .single();

    if (!data) break;
    chain.push(data);
    currentId = data.supersedes_id;
  }

  return chain;
}

/**
 * Get the correction history chain for an expense.
 */
export async function getExpenseHistory(expenseId: string): Promise<any[]> {
  const chain: any[] = [];
  let currentId: string | null = expenseId;

  while (currentId) {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", currentId)
      .single();

    if (!data) break;
    chain.push(data);
    currentId = data.supersedes_id;
  }

  return chain;
}

/**
 * Get the correction history chain for a calculation.
 */
export async function getCalculationHistory(calculationId: string): Promise<any[]> {
  const chain: any[] = [];
  let currentId: string | null = calculationId;

  while (currentId) {
    const { data } = await supabase
      .from("tax_calculations")
      .select("*")
      .eq("id", currentId)
      .single();

    if (!data) break;
    chain.push(data);
    currentId = data.supersedes_id;
  }

  return chain;
}
