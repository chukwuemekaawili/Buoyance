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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : String(message);
  }
  return String(error);
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
export async function connectBank(provider: BankProvider, workspaceId: string, code?: string): Promise<ConnectBankResult> {
  if (provider !== "mono") {
    return {
      success: false,
      error: `${provider} integration is not live in this build. Use manual imports for now.`,
      isStubbed: false,
    };
  }

  if (!code) {
    return {
      success: false,
      error: "Self-serve live bank connection is not wired into this UI yet. Use statement imports until the bank widget is enabled.",
      isStubbed: false,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("bank-connect", {
      body: { action: "exchange", code, workspace_id: workspaceId },
    });

    if (error) {
      return {
        success: false,
        error: getErrorMessage(error),
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
  } catch (err: unknown) {
    return {
      success: false,
      error: getErrorMessage(err) || "Unexpected error connecting bank.",
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
export async function getBankConnections(workspaceId: string): Promise<BankConnection[]> {
  const { data, error } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("connected_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch bank connections:", error);
    return [];
  }

  return (data || []) as unknown as BankConnection[];
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
  // Get the connection details first so we only sync caller-visible records
  const { data: connData } = await supabase
    .from("bank_connections")
    .select("id, provider")
    .eq("id", connectionId)
    .single();

  if (!connData) {
    return { success: false, error: "Connection not found.", isStubbed: false };
  }

  if (connData.provider !== "mono") {
    return {
      success: false,
      error:
        connData.provider === "manual"
          ? "This is a statement-only connection. Upload a new statement instead of running live sync."
          : `${connData.provider} live sync is not available in this build.`,
      isStubbed: false,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("bank-connect", {
      body: { action: "transactions", connection_id: connData.id },
    });

    if (error) {
      return {
        success: false,
        error: getErrorMessage(error) || "Live transaction sync is not available right now.",
        isStubbed: false,
      };
    }

    if (data?.success) {
      return {
        success: true,
        transactions: data.transactions,
        isStubbed: false,
      };
    }

    return {
      success: false,
      error: data?.error || "Live transaction sync is not available right now.",
      isStubbed: false,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: getErrorMessage(err) || "Live transaction sync is not available right now.",
      isStubbed: false,
    };
  }
}

/**
 * Get bank providers that are actually surfaced in this build.
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
      description: "Live bank-feed provider used by the current Edge Function implementation",
      countries: ["NG"],
    },
  ];
}
