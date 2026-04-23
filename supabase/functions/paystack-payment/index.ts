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

type PaymentRow = {
    id: string;
    user_id: string;
    workspace_id: string | null;
    amount_kobo: string;
    archived: boolean;
    reference: string | null;
    status: "pending" | "paid" | "failed" | "refunded";
};

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

function getSupabaseEnv() {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

async function getAuthenticatedClient(req: Request) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    const authorization = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !authorization) {
        return null;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: authorization,
            },
        },
    });

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
        return null;
    }

    return { supabase, user: data.user };
}

function getServiceRoleClient() {
    const { supabaseUrl, serviceRoleKey } = getSupabaseEnv();
    if (!supabaseUrl || !serviceRoleKey) {
        return null;
    }

    return createClient(supabaseUrl, serviceRoleKey);
}

async function getAccessiblePayment(
    supabase: ReturnType<typeof createClient>,
    paymentId: string,
): Promise<PaymentRow | null> {
    const { data, error } = await supabase
        .from("payments")
        .select("id, user_id, workspace_id, amount_kobo, archived, reference, status")
        .eq("id", paymentId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return (data as PaymentRow | null) ?? null;
}

async function getAccessiblePaymentByReference(
    supabase: ReturnType<typeof createClient>,
    reference: string,
): Promise<PaymentRow | null> {
    const { data, error } = await supabase
        .from("payments")
        .select("id, user_id, workspace_id, amount_kobo, archived, reference, status")
        .eq("reference", reference)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return (data as PaymentRow | null) ?? null;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackKey) {
        return jsonResponse({ error: "PAYSTACK_SECRET_KEY is not configured. Set it in Supabase secrets." }, 503);
    }

    try {
        const authContext = await getAuthenticatedClient(req);
        if (!authContext) {
            return jsonResponse({ error: "Authentication required." }, 401);
        }

        const { action, ...params } = await req.json();

        // ─── INITIALIZE ───
        if (action === "initialize") {
            const { email, amount_kobo, payment_id, callback_url } = params;
            if (!email || !amount_kobo || !payment_id) {
                return jsonResponse({ error: "email, amount_kobo, and payment_id are required" }, 400);
            }

            const requestedAmount = Number(amount_kobo);
            if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
                return jsonResponse({ error: "amount_kobo must be a positive number" }, 400);
            }

            const payment = await getAccessiblePayment(authContext.supabase, String(payment_id));
            if (!payment || payment.archived) {
                return jsonResponse({ error: "Payment record not found or not accessible." }, 404);
            }

            if (payment.status === "paid") {
                return jsonResponse({ error: "This payment has already been completed." }, 409);
            }

            const storedAmount = Number(payment.amount_kobo);
            if (!Number.isFinite(storedAmount) || storedAmount !== requestedAmount) {
                return jsonResponse({ error: "Amount does not match the stored payment record." }, 400);
            }

            if (
                authContext.user.email &&
                typeof email === "string" &&
                authContext.user.email.toLowerCase() !== email.toLowerCase()
            ) {
                return jsonResponse({ error: "Payment email must match the signed-in user." }, 400);
            }

            const reference =
                typeof payment.reference === "string" && payment.reference.trim().length > 0
                    ? payment.reference.trim()
                    : `BUO-${payment.id}`;

            const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${paystackKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    amount: requestedAmount, // Paystack expects amount in kobo
                    currency: "NGN",
                    reference,
                    callback_url: callback_url || undefined,
                    metadata: {
                        payment_id: payment.id,
                        workspace_id: payment.workspace_id,
                        source: "buoyance",
                    },
                }),
            });

            const data = await res.json();
            if (!data.status) {
                return jsonResponse({ error: data.message || "Paystack initialization failed" }, 400);
            }

            const serviceRoleClient = getServiceRoleClient();
            if (serviceRoleClient) {
                await serviceRoleClient
                    .from("payments")
                    .update({
                        reference: data.data.reference,
                        payment_method: "paystack",
                    })
                    .eq("id", payment.id);
            }

            return jsonResponse({
                success: true,
                authorization_url: data.data.authorization_url,
                access_code: data.data.access_code,
                reference: data.data.reference,
            });
        }

        // ─── VERIFY ───
        if (action === "verify") {
            const { reference } = params;
            if (!reference) {
                return jsonResponse({ error: "reference is required" }, 400);
            }

            const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
                headers: { Authorization: `Bearer ${paystackKey}` },
            });

            const data = await res.json();
            if (!data.status) {
                return jsonResponse({ error: data.message || "Verification failed" }, 400);
            }

            const txn = data.data;
            const paymentId =
                typeof txn?.metadata?.payment_id === "string" ? txn.metadata.payment_id : null;
            const payment = paymentId
                ? await getAccessiblePayment(authContext.supabase, paymentId)
                : await getAccessiblePaymentByReference(authContext.supabase, String(txn.reference ?? reference));

            if (!payment || payment.archived) {
                return jsonResponse({ error: "Payment record not found or not accessible." }, 404);
            }

            const verifiedAmount = Number(txn.amount);
            const storedAmount = Number(payment.amount_kobo);
            if (Number.isFinite(verifiedAmount) && Number.isFinite(storedAmount) && verifiedAmount !== storedAmount) {
                return jsonResponse({ error: "Verified amount does not match the stored payment record." }, 409);
            }

            const serviceRoleClient = getServiceRoleClient();
            if (!serviceRoleClient) {
                return jsonResponse({ error: "Payment verification is not fully configured." }, 503);
            }

            const { error: updateError } = await serviceRoleClient
                    .from("payments")
                    .update({
                        status: txn.status === "success" ? "paid" : "failed",
                        paid_at: txn.status === "success" ? new Date().toISOString() : null,
                        reference: txn.reference,
                        payment_method: "paystack",
                    })
                    .eq("id", payment.id);

            if (updateError) {
                return jsonResponse({ error: updateError.message }, 500);
            }

            return jsonResponse({
                success: txn.status === "success",
                status: txn.status,
                amount_kobo: txn.amount,
                reference: txn.reference,
                gateway_response: txn.gateway_response,
            });
        }

        return jsonResponse(
            { error: `Unknown action: ${action}. Use 'initialize' or 'verify'.` },
            400
        );

    } catch (error) {
        return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
});
