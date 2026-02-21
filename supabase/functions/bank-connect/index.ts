// Bank Connect Edge Function
// Handles Mono Connect widget token exchange and transaction sync.
// Requires MONO_SECRET_KEY in Supabase secrets.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONO_BASE = "https://api.withmono.com/v2";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const monoKey = Deno.env.get("MONO_SECRET_KEY");

    try {
        const { action, ...params } = await req.json();

        // ─── STATUS: Check if Mono is configured ───
        if (action === "status") {
            return new Response(
                JSON.stringify({ configured: !!monoKey }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!monoKey) {
            return new Response(
                JSON.stringify({ error: "MONO_SECRET_KEY is not configured. Set it in Supabase secrets.", configured: false }),
                { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ─── EXCHANGE: Convert Connect widget code to account ID ───
        if (action === "exchange") {
            const { code } = params;
            if (!code) {
                return new Response(
                    JSON.stringify({ error: "code is required" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
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
                return new Response(
                    JSON.stringify({ error: data.message || "Failed to exchange code" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    account_id: data.data?.id || data.id,
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ─── ACCOUNT INFO: Get linked account details ───
        if (action === "account_info") {
            const { account_id } = params;
            if (!account_id) {
                return new Response(
                    JSON.stringify({ error: "account_id is required" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const res = await fetch(`${MONO_BASE}/accounts/${account_id}`, {
                headers: { "mono-sec-key": monoKey },
            });

            const data = await res.json();
            return new Response(
                JSON.stringify({ success: res.ok, account: data.data || data }),
                { status: res.ok ? 200 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ─── TRANSACTIONS: Fetch recent transactions ───
        if (action === "transactions") {
            const { account_id, start, end } = params;
            if (!account_id) {
                return new Response(
                    JSON.stringify({ error: "account_id is required" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Default to last 90 days
            const endDate = end || new Date().toISOString().split("T")[0];
            const startDate = start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

            const url = `${MONO_BASE}/accounts/${account_id}/transactions?start=${startDate}&end=${endDate}&paginate=false`;
            const res = await fetch(url, {
                headers: { "mono-sec-key": monoKey },
            });

            const data = await res.json();
            if (!res.ok) {
                return new Response(JSON.stringify({ error: data.message || "Failed to fetch transactions" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            const transactions = (data.data || []).map((tx: any) => ({
                id: tx._id || tx.id,
                date: tx.date,
                description: tx.narration || tx.description || "",
                amount: Math.abs(tx.amount) / 100, // Mono returns kobo
                type: tx.type === "credit" ? "credit" : "debit",
                category: tx.category || undefined,
                balance: tx.balance ? tx.balance / 100 : undefined,
            }));

            return new Response(
                JSON.stringify({ success: true, transactions, count: transactions.length }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: `Unknown action: ${action}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
