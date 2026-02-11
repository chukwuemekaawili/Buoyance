/**
 * Income Service
 * 
 * Manages user income records.
 */

import { supabase } from "@/integrations/supabase/client";

export interface Income {
  id: string;
  user_id: string;
  source: string;
  amount_kobo: string;
  date: string;
  category: string | null;
  description: string | null;
  created_at: string;
  archived: boolean;
}

export interface CreateIncomeInput {
  source: string;
  amount_kobo: string;
  date: string;
  category?: string;
  description?: string;
}

/**
 * Create a new income record
 */
export async function createIncome(input: CreateIncomeInput): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("incomes")
    .insert({
      user_id: user.id,
      ...input,
      archived: false,
    } as any)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create income:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Get all incomes for the current user
 */
export async function getIncomes(includeArchived = false): Promise<Income[]> {
  let query = supabase
    .from("incomes")
    .select("*")
    .order("date", { ascending: false });

  if (!includeArchived) {
    query = query.eq("archived", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch incomes:", error);
    return [];
  }

  return data as Income[];
}

/**
 * Update an income record
 */
export async function updateIncome(id: string, updates: Partial<CreateIncomeInput>): Promise<boolean> {
  const { error } = await supabase
    .from("incomes")
    .update(updates as any)
    .eq("id", id);

  if (error) {
    console.error("Failed to update income:", error);
    return false;
  }

  return true;
}

/**
 * Archive an income record
 */
export async function archiveIncome(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("incomes")
    .update({ archived: true } as any)
    .eq("id", id);

  if (error) {
    console.error("Failed to archive income:", error);
    return false;
  }

  return true;
}

/**
 * Get income categories
 */
export function getIncomeCategories(): string[] {
  return [
    "Employment",
    "Self-Employment",
    "Business",
    "Rental",
    "Dividend",
    "Interest",
    "Capital Gains",
    "Freelance",
    "Consulting",
    "Commission",
    "Bonus",
    "Pension",
    "Other",
  ];
}
