/**
 * Expense Service
 * 
 * Manages user expense records.
 */

import { supabase } from "@/integrations/supabase/client";

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount_kobo: string;
  date: string;
  category: string;
  deductible: boolean;
  created_at: string;
  archived: boolean;
}

export interface CreateExpenseInput {
  description: string;
  amount_kobo: string;
  date: string;
  category: string;
  deductible?: boolean;
}

/**
 * Create a new expense record
 */
export async function createExpense(input: CreateExpenseInput): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      user_id: user.id,
      ...input,
      deductible: input.deductible ?? false,
      archived: false,
    } as any)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create expense:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Get all expenses for the current user
 */
export async function getExpenses(includeArchived = false): Promise<Expense[]> {
  let query = supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });

  if (!includeArchived) {
    query = query.eq("archived", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch expenses:", error);
    return [];
  }

  return data as Expense[];
}

/**
 * Update an expense record
 */
export async function updateExpense(id: string, updates: Partial<CreateExpenseInput>): Promise<boolean> {
  const { error } = await supabase
    .from("expenses")
    .update(updates as any)
    .eq("id", id);

  if (error) {
    console.error("Failed to update expense:", error);
    return false;
  }

  return true;
}

/**
 * Archive an expense record
 */
export async function archiveExpense(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("expenses")
    .update({ archived: true } as any)
    .eq("id", id);

  if (error) {
    console.error("Failed to archive expense:", error);
    return false;
  }

  return true;
}

/**
 * Get expense categories
 */
export function getExpenseCategories(): Array<{ id: string; name: string; deductible: boolean }> {
  return [
    { id: "office_supplies", name: "Office Supplies", deductible: true },
    { id: "travel", name: "Travel & Transport", deductible: true },
    { id: "utilities", name: "Utilities", deductible: true },
    { id: "rent", name: "Rent & Lease", deductible: true },
    { id: "professional_fees", name: "Professional Fees", deductible: true },
    { id: "insurance", name: "Insurance", deductible: true },
    { id: "equipment", name: "Equipment", deductible: true },
    { id: "maintenance", name: "Repairs & Maintenance", deductible: true },
    { id: "advertising", name: "Advertising & Marketing", deductible: true },
    { id: "training", name: "Training & Education", deductible: true },
    { id: "bank_charges", name: "Bank Charges", deductible: true },
    { id: "entertainment", name: "Entertainment", deductible: false },
    { id: "personal", name: "Personal", deductible: false },
    { id: "other", name: "Other", deductible: false },
  ];
}

/**
 * Get total deductible expenses
 */
export async function getTotalDeductibleExpenses(): Promise<bigint> {
  const expenses = await getExpenses(false);
  
  let total = 0n;
  for (const expense of expenses) {
    if (expense.deductible) {
      total += BigInt(expense.amount_kobo);
    }
  }
  
  return total;
}
