/**
 * Banking Service
 * 
 * Provides integration with banking data providers (Mono, Okra, Plaid).
 * Uses the `bank-connect` Supabase Edge Function for secure server-side API calls.
 */

import { supabase } from "@/integrations/supabase/client";

export type BankProvider = "mono" | "okra" | "plaid";

export interface BankConnection {
  id: string;
  user_id: string;
  provider: BankProvider;
  account_id: string;
  account_name: string | null;
  connected_at: string;
  last_sync: string | null;
  status: "active" | "disconnected" | "error";
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  category?: string;
  balance?: number;
}

export interface ConnectBankResult {
  success: boolean;
  connectionId?: string;
  error?: string;
  isStubbed: boolean;
}

/**
 * Check if banking integration is available by asking the Edge Function
 */
export async function isBankingAvailable(): Promise<{ available: boolean; provider?: BankProvider; reason?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("bank-connect", {
      body: { action: "status" },
    });

    if (error || !data?.configured) {
      return {
        available: false,
        reason: "Banking integration requires MONO_SECRET_KEY to be set in Supabase secrets.",
      };
    }

    return { available: true, provider: "mono" };
  } catch {
    return {
      available: false,
      reason: "Could not check banking status. The bank-connect Edge Function may not be deployed.",
    };
  }
}

/**
 * Exchange Mono Connect widget code for an account ID via the Edge Function
 */
export async function connectBank(provider: BankProvider, code?: string): Promise<ConnectBankResult> {
  if (provider !== "mono") {
    return {
      success: false,
      error: `${provider} integration is coming soon. Only Mono is currently supported.`,
      isStubbed: true,
    };
  }

  if (!code) {
    // No Mono widget code provided — create a demo connection
    return {
      success: true,
      connectionId: crypto.randomUUID(),
      isStubbed: true,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("bank-connect", {
      body: { action: "exchange", code },
    });

    if (error) {
      return {
        success: false,
        error: typeof error === "object" && "message" in error ? (error as any).message : String(error),
        isStubbed: false,
      };
    }

    if (data?.success && data?.account_id) {
      return {
        success: true,
        connectionId: data.account_id,
        isStubbed: false,
      };
    }

    return {
      success: false,
      error: data?.error || "Failed to connect bank account.",
      isStubbed: false,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Unexpected error connecting bank.",
      isStubbed: false,
    };
  }
}

/**
 * Disconnect a bank account
 */
export async function disconnectBank(connectionId: string): Promise<boolean> {
  const { error } = await supabase
    .from("bank_connections")
    .delete()
    .eq("id", connectionId);

  if (error) {
    console.error("Failed to disconnect bank:", error);
    return false;
  }

  return true;
}

/**
 * Get user's bank connections
 */
export async function getBankConnections(): Promise<BankConnection[]> {
  const { data, error } = await supabase
    .from("bank_connections")
    .select("*")
    .order("connected_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch bank connections:", error);
    return [];
  }

  return data as BankConnection[];
}

/**
 * Sync transactions from a connected bank via the Edge Function
 */
export async function syncBankTransactions(connectionId: string): Promise<{
  success: boolean;
  transactions?: BankTransaction[];
  error?: string;
  isStubbed: boolean;
}> {
  // Get the connection to find the account_id
  const { data: connData } = await supabase
    .from("bank_connections")
    .select("account_id, provider")
    .eq("id", connectionId)
    .single();

  if (!connData) {
    return { success: false, error: "Connection not found.", isStubbed: false };
  }

  try {
    const { data, error } = await supabase.functions.invoke("bank-connect", {
      body: { action: "transactions", account_id: connData.account_id },
    });

    if (error) {
      // If the Edge Function returns 503 (not configured), return demo data
      return {
        success: true,
        transactions: generateDemoTransactions(),
        isStubbed: true,
      };
    }

    if (data?.success) {
      return {
        success: true,
        transactions: data.transactions,
        isStubbed: false,
      };
    }

    // Fallback to demo data if Mono returns an error
    return {
      success: true,
      transactions: generateDemoTransactions(),
      isStubbed: true,
    };
  } catch {
    return {
      success: true,
      transactions: generateDemoTransactions(),
      isStubbed: true,
    };
  }
}

/**
 * Generate demo transactions for when Mono is not configured
 */
function generateDemoTransactions(): BankTransaction[] {
  const now = new Date();
  return [
    { id: "demo-1", date: new Date(now.getTime() - 1 * 86400000).toISOString(), description: "Salary Credit - Employer Ltd", amount: 450000, type: "credit", category: "income" },
    { id: "demo-2", date: new Date(now.getTime() - 2 * 86400000).toISOString(), description: "MTN Airtime Purchase", amount: 5000, type: "debit", category: "utilities" },
    { id: "demo-3", date: new Date(now.getTime() - 3 * 86400000).toISOString(), description: "Shoprite - Grocery Purchase", amount: 28750, type: "debit", category: "groceries" },
    { id: "demo-4", date: new Date(now.getTime() - 5 * 86400000).toISOString(), description: "Client Invoice Payment - ABC Corp", amount: 175000, type: "credit", category: "income" },
    { id: "demo-5", date: new Date(now.getTime() - 7 * 86400000).toISOString(), description: "IKEDC Electricity Bill", amount: 15400, type: "debit", category: "utilities" },
    { id: "demo-6", date: new Date(now.getTime() - 10 * 86400000).toISOString(), description: "Uber Ride", amount: 3200, type: "debit", category: "transport" },
    { id: "demo-7", date: new Date(now.getTime() - 12 * 86400000).toISOString(), description: "Freelance Payment - Design Work", amount: 95000, type: "credit", category: "income" },
    { id: "demo-8", date: new Date(now.getTime() - 15 * 86400000).toISOString(), description: "Rent Payment", amount: 250000, type: "debit", category: "housing" },
  ];
}

/**
 * Get supported bank providers
 */
export function getSupportedProviders(): Array<{
  id: BankProvider;
  name: string;
  description: string;
  countries: string[];
}> {
  return [
    {
      id: "mono",
      name: "Mono",
      description: "Connect Nigerian bank accounts",
      countries: ["NG"],
    },
    {
      id: "okra",
      name: "Okra",
      description: "Nigerian open banking platform",
      countries: ["NG"],
    },
    {
      id: "plaid",
      name: "Plaid",
      description: "International bank connections",
      countries: ["US", "CA", "GB", "EU"],
    },
  ];
}
