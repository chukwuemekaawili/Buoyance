/**
 * useRecordsForPeriod Hook
 * 
 * Fetches user income and expense records for a specific period
 * and provides aggregated totals for calculator integration.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { writeAuditLog } from "@/lib/auditLog";
import { stringToKobo } from "@/lib/money";

export interface Income {
  id: string;
  source: string;
  amount_kobo: string;
  date: string;
  category: string | null;
  description: string | null;
  vatable: boolean;
  output_vat_kobo: string | null;
  wht_deducted: boolean;
  wht_credit_kobo: number | null;
}

export interface Expense {
  id: string;
  description: string;
  amount_kobo: string;
  date: string;
  category: string;
  deductible: boolean;
  vatable: boolean;
  input_vat_kobo: string | null;
  invoice_ref: string | null;
}

export interface RecordsSummary {
  // Income totals
  totalIncomeKobo: bigint;
  totalVatableIncomeKobo: bigint;
  totalOutputVatKobo: bigint;
  totalWhtCreditsKobo: bigint;
  
  // Expense totals
  totalExpensesKobo: bigint;
  totalDeductibleExpensesKobo: bigint;
  totalNonDeductibleExpensesKobo: bigint;
  totalVatableExpensesKobo: bigint;
  totalInputVatKobo: bigint;
  
  // Record counts
  incomeCount: number;
  expenseCount: number;
  excludedIncomeCount: number;
  excludedExpenseCount: number;
  
  // Included/excluded records for explainability
  includedIncomes: Income[];
  includedExpenses: Expense[];
  excludedIncomes: Array<{ income: Income; reason: string }>;
  excludedExpenses: Array<{ expense: Expense; reason: string }>;
}

interface UseRecordsForPeriodResult {
  loading: boolean;
  error: string | null;
  summary: RecordsSummary | null;
  loadRecords: (periodStart: string, periodEnd: string, taxType: string) => Promise<void>;
  clearRecords: () => void;
}

const VAT_RATE = 0.075; // 7.5%

export function useRecordsForPeriod(): UseRecordsForPeriodResult {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RecordsSummary | null>(null);

  const loadRecords = useCallback(async (periodStart: string, periodEnd: string, taxType: string) => {
    if (!user) {
      setError("You must be signed in to load records.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch ACTIVE incomes only (exclude superseded/archived records)
      const { data: incomes, error: incomesError } = await supabase
        .from("incomes")
        .select("id, source, amount_kobo, date, category, description, vatable, output_vat_kobo, wht_deducted, wht_credit_kobo, status")
        .eq("user_id", user.id)
        .eq("archived", false)
        .eq("status", "active")
        .gte("date", periodStart)
        .lte("date", periodEnd)
        .order("date", { ascending: false });

      if (incomesError) throw incomesError;

      // Fetch ACTIVE expenses only (exclude superseded/archived records)
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("id, description, amount_kobo, date, category, deductible, vatable, input_vat_kobo, invoice_ref, status")
        .eq("user_id", user.id)
        .eq("archived", false)
        .eq("status", "active")
        .gte("date", periodStart)
        .lte("date", periodEnd)
        .order("date", { ascending: false });

      if (expensesError) throw expensesError;

      // Process incomes
      const includedIncomes: Income[] = [];
      const excludedIncomes: Array<{ income: Income; reason: string }> = [];
      
      let totalIncomeKobo = 0n;
      let totalVatableIncomeKobo = 0n;
      let totalOutputVatKobo = 0n;
      let totalWhtCreditsKobo = 0n;

      for (const inc of (incomes || []) as Income[]) {
        if (!inc.date) {
          excludedIncomes.push({ income: inc, reason: "Missing date" });
          continue;
        }

        includedIncomes.push(inc);
        const amountKobo = stringToKobo(inc.amount_kobo);
        totalIncomeKobo += amountKobo;

        if (inc.vatable) {
          totalVatableIncomeKobo += amountKobo;
          // Use override if provided, otherwise calculate 7.5%
          if (inc.output_vat_kobo) {
            totalOutputVatKobo += stringToKobo(inc.output_vat_kobo);
          } else {
            totalOutputVatKobo += BigInt(Math.floor(Number(amountKobo) * VAT_RATE));
          }
        }

        // WHT credits
        if (inc.wht_deducted && inc.wht_credit_kobo) {
          totalWhtCreditsKobo += BigInt(inc.wht_credit_kobo);
        }
      }

      // Process expenses
      const includedExpenses: Expense[] = [];
      const excludedExpenses: Array<{ expense: Expense; reason: string }> = [];
      
      let totalExpensesKobo = 0n;
      let totalDeductibleExpensesKobo = 0n;
      let totalNonDeductibleExpensesKobo = 0n;
      let totalVatableExpensesKobo = 0n;
      let totalInputVatKobo = 0n;

      for (const exp of (expenses || []) as Expense[]) {
        if (!exp.date) {
          excludedExpenses.push({ expense: exp, reason: "Missing date" });
          continue;
        }

        includedExpenses.push(exp);
        const amountKobo = stringToKobo(exp.amount_kobo);
        totalExpensesKobo += amountKobo;

        if (exp.deductible) {
          totalDeductibleExpensesKobo += amountKobo;
        } else {
          totalNonDeductibleExpensesKobo += amountKobo;
          excludedExpenses.push({ expense: exp, reason: "Non-deductible category" });
        }

        if (exp.vatable) {
          totalVatableExpensesKobo += amountKobo;
          // Use stored input VAT if available, otherwise calculate
          if (exp.input_vat_kobo) {
            totalInputVatKobo += stringToKobo(exp.input_vat_kobo);
          } else {
            totalInputVatKobo += BigInt(Math.floor(Number(amountKobo) * VAT_RATE));
          }
        }
      }

      // Audit log
      await writeAuditLog({
        action: "calculator.records_loaded",
        entity_type: "calculator",
        entity_id: taxType,
        metadata: {
          tax_type: taxType,
          period_start: periodStart,
          period_end: periodEnd,
          income_count: includedIncomes.length,
          expense_count: includedExpenses.length,
        },
      });

      setSummary({
        totalIncomeKobo,
        totalVatableIncomeKobo,
        totalOutputVatKobo,
        totalWhtCreditsKobo,
        totalExpensesKobo,
        totalDeductibleExpensesKobo,
        totalNonDeductibleExpensesKobo,
        totalVatableExpensesKobo,
        totalInputVatKobo,
        incomeCount: includedIncomes.length,
        expenseCount: includedExpenses.length,
        excludedIncomeCount: excludedIncomes.length,
        excludedExpenseCount: excludedExpenses.length,
        includedIncomes,
        includedExpenses,
        excludedIncomes,
        excludedExpenses,
      });
    } catch (err: any) {
      console.error("Failed to load records:", err);
      setError(err.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearRecords = useCallback(() => {
    setSummary(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    summary,
    loadRecords,
    clearRecords,
  };
}
