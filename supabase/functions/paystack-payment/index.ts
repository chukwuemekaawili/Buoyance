// Paystack Payment Edge Function
// Handles initialize and verify operations for Paystack payments.
// Requires PAYSTACK_SECRET_KEY in Supabase secrets.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYSTACK_BASE = "https://api.paystack.co";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackKey) {
        return new Response(
            JSON.stringify({ error: "PAYSTACK_SECRET_KEY is not configured. Set it in Supabase secrets." }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    try {
        const { action, ...params } = await req.json();

        // ─── INITIALIZE ───
        if (action === "initialize") {
            const { email, amount_kobo, payment_id, callback_url } = params;
            if (!email || !amount_kobo) {
                return new Response(
                    JSON.stringify({ error: "email and amount_kobo are required" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${paystackKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    amount: amount_kobo, // Paystack expects amount in kobo
                    currency: "NGN",
                    reference: `BUO-${payment_id || Date.now()}`,
                    callback_url: callback_url || undefined,
                    metadata: { payment_id, source: "buoyance" },
                }),
            });

            const data = await res.json();
            if (!data.status) {
                return new Response(
                    JSON.stringify({ error: data.message || "Paystack initialization failed" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    authorization_url: data.data.authorization_url,
                    access_code: data.data.access_code,
                    reference: data.data.reference,
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ─── VERIFY ───
        if (action === "verify") {
            const { reference } = params;
            if (!reference) {
                return new Response(
                    JSON.stringify({ error: "reference is required" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
                headers: { Authorization: `Bearer ${paystackKey}` },
            });

            const data = await res.json();
            if (!data.status) {
                return new Response(
                    JSON.stringify({ error: data.message || "Verification failed" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const txn = data.data;

            // Update payment record in DB if payment_id is in metadata
            if (txn.metadata?.payment_id) {
                const supabase = createClient(
                    Deno.env.get("SUPABASE_URL") ?? "",
                    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
                );

                await supabase
                    .from("payments")
                    .update({
                        status: txn.status === "success" ? "paid" : "failed",
                        paid_at: txn.status === "success" ? new Date().toISOString() : null,
                        reference: txn.reference,
                    } as any)
                    .eq("id", txn.metadata.payment_id);
            }

            return new Response(
                JSON.stringify({
                    success: txn.status === "success",
                    status: txn.status,
                    amount_kobo: txn.amount,
                    reference: txn.reference,
                    gateway_response: txn.gateway_response,
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: `Unknown action: ${action}. Use 'initialize' or 'verify'.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
