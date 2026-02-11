/**
 * Banking Service
 * 
 * Provides integration with banking data providers (Mono, Okra, Plaid).
 * Currently in stub mode - requires API keys to be functional.
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
 * Check if banking integration is available
 */
export function isBankingAvailable(): { available: boolean; provider?: BankProvider; reason?: string } {
  // In stub mode, return as unavailable
  return {
    available: false,
    reason: "Banking integration requires API keys to be configured (MONO_SECRET_KEY or OKRA_SECRET_KEY).",
  };
}

/**
 * Initiate bank connection (stub mode)
 */
export async function connectBank(provider: BankProvider): Promise<ConnectBankResult> {
  const status = isBankingAvailable();
  
  if (!status.available) {
    return {
      success: false,
      error: status.reason,
      isStubbed: true,
    };
  }

  // Would initiate OAuth flow with provider here
  return {
    success: false,
    error: "Bank connection is not yet implemented. Coming soon!",
    isStubbed: true,
  };
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
 * Sync transactions from a connected bank (stub)
 */
export async function syncBankTransactions(connectionId: string): Promise<{
  success: boolean;
  transactions?: BankTransaction[];
  error?: string;
  isStubbed: boolean;
}> {
  return {
    success: false,
    error: "Transaction sync requires active banking integration. API keys not configured.",
    isStubbed: true,
  };
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
