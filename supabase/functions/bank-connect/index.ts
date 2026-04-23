// Bank Connect Edge Function
// Handles Mono Connect widget token exchange and transaction sync.
// Requires MONO_SECRET_KEY in Supabase secrets.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
    consumeQuota,
    getAccessibleWorkspace,
    getAuthenticatedContext,
    releaseQuota,
} from "../_shared/workspace.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONO_BASE = "https://api.withmono.com/v2";

interface MonoTransaction {
    _id?: string;
    id?: string;
    date: string;
    narration?: string;
    description?: string;
    amount: number;
    type?: string;
    category?: string;
    balance?: number;
}

interface BankConnectionRow {
    id: string;
    account_id: string;
    workspace_id: string | null;
}

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const monoKey = Deno.env.get("MONO_SECRET_KEY");
    let authContext: Awaited<ReturnType<typeof getAuthenticatedContext>> = null;
    let quotaWorkspaceId: string | null = null;
    let quotaConsumed = false;

    try {
        const { action, ...params } = await req.json();

        // ─── STATUS: Check if Mono is configured ───
        if (action === "status") {
            return jsonResponse({ configured: !!monoKey });
        }

        if (!monoKey) {
            return jsonResponse({ error: "MONO_SECRET_KEY is not configured. Set it in Supabase secrets.", configured: false }, 503);
        }

        authContext = await getAuthenticatedContext(req);
        if (!authContext) {
            return jsonResponse({ error: "Authentication required." }, 401);
        }

        // ─── EXCHANGE: Convert Connect widget code to account ID ───
        if (action === "exchange") {
            const { code, workspace_id } = params;
            if (!code || !workspace_id) {
                return jsonResponse({ error: "code and workspace_id are required" }, 400);
            }

            const workspace = await getAccessibleWorkspace(authContext.supabase, String(workspace_id));
            if (!workspace) {
                return jsonResponse({ error: "Workspace not found or not accessible." }, 403);
            }

            const res = await fetch(`${MONO_BASE}/accounts/auth`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "mono-sec-key": monoKey,
                },
                body: JSON.stringify({ code }),
            });

            const data = await res.json();
            if (!res.ok) {
                return jsonResponse({ error: data.message || "Failed to exchange code" }, 400);
            }

            return jsonResponse({
                success: true,
                account_id: data.data?.id || data.id,
            });
        }

        // ─── ACCOUNT INFO: Get linked account details ───
        if (action === "account_info") {
            const { connection_id } = params;
            if (!connection_id) {
                return jsonResponse({ error: "connection_id is required" }, 400);
            }

            const { data: connection, error } = await authContext.supabase
                .from("bank_connections")
                .select("id, account_id, workspace_id")
                .eq("id", String(connection_id))
                .maybeSingle();

            if (error) {
                return jsonResponse({ error: error.message }, 500);
            }

            const bankConnection = connection as BankConnectionRow | null;
            if (!bankConnection) {
                return jsonResponse({ error: "Bank connection not found or not accessible." }, 404);
            }

            const res = await fetch(`${MONO_BASE}/accounts/${bankConnection.account_id}`, {
                headers: { "mono-sec-key": monoKey },
            });

            const data = await res.json();
            return jsonResponse({ success: res.ok, account: data.data || data }, res.ok ? 200 : 400);
        }

        // ─── TRANSACTIONS: Fetch recent transactions ───
        if (action === "transactions") {
            const { connection_id, start, end } = params;
            if (!connection_id) {
                return jsonResponse({ error: "connection_id is required" }, 400);
            }

            const { data: connection, error } = await authContext.supabase
                .from("bank_connections")
                .select("id, account_id, workspace_id")
                .eq("id", String(connection_id))
                .maybeSingle();

            if (error) {
                return jsonResponse({ error: error.message }, 500);
            }

            const bankConnection = connection as BankConnectionRow | null;
            if (!bankConnection) {
                return jsonResponse({ error: "Bank connection not found or not accessible." }, 404);
            }

            if (!bankConnection.workspace_id) {
                return jsonResponse({ error: "Bank connection is missing a workspace binding." }, 400);
            }

            // Default to last 90 days
            const endDate = end || new Date().toISOString().split("T")[0];
            const startDate = start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

            const quota = await consumeQuota(authContext.supabase, bankConnection.workspace_id, "bank_syncs");
            if (!quota.allowed) {
                return jsonResponse({ error: "Bank sync quota exceeded for this workspace." }, 429);
            }

            quotaWorkspaceId = bankConnection.workspace_id;
            quotaConsumed = true;

            const url = `${MONO_BASE}/accounts/${bankConnection.account_id}/transactions?start=${startDate}&end=${endDate}&paginate=false`;
            const res = await fetch(url, {
                headers: { "mono-sec-key": monoKey },
            });

            const data = await res.json();
            if (!res.ok) {
                if (quotaConsumed && quotaWorkspaceId) {
                    await releaseQuota(authContext.supabase, quotaWorkspaceId, "bank_syncs");
                }
                return jsonResponse({ error: data.message || "Failed to fetch transactions" }, 400);
            }

            const monoTransactions = (data.data || []) as MonoTransaction[];
            const transactions = monoTransactions.map((tx) => ({
                id: tx._id || tx.id,
                date: tx.date,
                description: tx.narration || tx.description || "",
                amount: Math.abs(tx.amount) / 100, // Mono returns kobo
                type: tx.type === "credit" ? "credit" : "debit",
                category: tx.category || undefined,
                balance: tx.balance ? tx.balance / 100 : undefined,
            }));

            return jsonResponse({ success: true, transactions, count: transactions.length });
        }

        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    } catch (error) {
        if (quotaConsumed && authContext && quotaWorkspaceId) {
            await releaseQuota(authContext.supabase, quotaWorkspaceId, "bank_syncs");
        }
        return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
});
