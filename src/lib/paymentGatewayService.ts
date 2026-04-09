/**
 * Payment Gateway Service
 * 
 * Handles integration with payment providers (Paystack, Flutterwave).
 * Uses the `paystack-payment` Supabase Edge Function for secure server-side API calls.
 */

import { supabase } from "@/integrations/supabase/client";

export type PaymentGateway = "paystack" | "flutterwave";

export interface InitiatePaymentResult {
  success: boolean;
  authorizationUrl?: string;
  reference?: string;
  error?: string;
  isStubbed: boolean;
}

export interface VerifyPaymentResult {
  success: boolean;
  status?: "success" | "failed" | "pending";
  amount?: number;
  reference?: string;
  gatewayResponse?: Record<string, unknown>;
  error?: string;
  isStubbed: boolean;
}

/**
 * Initiate a payment via the Paystack Edge Function.
 * Opens the Paystack checkout page in a new tab/popup.
 */
export async function initiatePayment(
  paymentId: string,
  amountKobo: string,
  email: string,
  gateway: PaymentGateway = "paystack"
): Promise<InitiatePaymentResult> {
  if (gateway !== "paystack") {
    return {
      success: false,
      error: "Only Paystack is currently supported. Flutterwave integration coming soon.",
      isStubbed: true,
    };
  }

  try {
    const callbackUrl = `${window.location.origin}/payments?verify=true`;

    const { data, error } = await supabase.functions.invoke("paystack-payment", {
      body: {
        action: "initialize",
        email,
        amount_kobo: parseInt(amountKobo, 10),
        payment_id: paymentId,
        callback_url: callbackUrl,
      },
    });

    if (error) {
      // Edge function returned an error (e.g. 503 = no API key)
      const message = typeof error === "object" && "message" in error
        ? (error as any).message
        : String(error);

      // Check if the error is due to missing API key
      if (message.includes("PAYSTACK_SECRET_KEY") || message.includes("503")) {
        return {
          success: false,
          error: "Paystack is not yet configured. Please set the PAYSTACK_SECRET_KEY in your Supabase secrets, then try again.",
          isStubbed: true,
        };
      }

      return {
        success: false,
        error: message,
        isStubbed: false,
      };
    }

    if (data?.success && data?.authorization_url) {
      return {
        success: true,
        authorizationUrl: data.authorization_url,
        reference: data.reference,
        isStubbed: false,
      };
    }

    return {
      success: false,
      error: data?.error || "Failed to initialize payment.",
      isStubbed: false,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An unexpected error occurred while initiating payment.",
      isStubbed: false,
    };
  }
}

/**
 * Verify a payment via the Paystack Edge Function.
 */
export async function verifyPayment(
  reference: string,
  gateway: PaymentGateway = "paystack"
): Promise<VerifyPaymentResult> {
  if (gateway !== "paystack") {
    return {
      success: false,
      error: "Only Paystack verification is currently supported.",
      isStubbed: true,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("paystack-payment", {
      body: {
        action: "verify",
        reference,
      },
    });

    if (error) {
      return {
        success: false,
        error: typeof error === "object" && "message" in error
          ? (error as any).message
          : String(error),
        isStubbed: false,
      };
    }

    return {
      success: data?.success ?? false,
      status: data?.status,
      amount: data?.amount_kobo,
      reference: data?.reference,
      gatewayResponse: { gateway_response: data?.gateway_response },
      isStubbed: false,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An unexpected error occurred during verification.",
      isStubbed: false,
    };
  }
}

/**
 * Handle payment callback - updates the local DB record after Paystack redirect.
 *
 * ⚠️ CURRENTLY DEAD CODE — this function is exported but never called anywhere in the app.
 *
 * The Paystack redirect URL is set to `/payments?verify=true` (see initiatePayment above),
 * but the Payments page does NOT read the `verify` query param or invoke this function.
 * As a result, gateway payments currently stay at status="pending" indefinitely after redirect.
 *
 * DO NOT wire this up client-side without the webhook backend in place first.
 *
 * SECURITY WARNING: If wired up client-side, this function would transition a payment to
 * "paid" based solely on a browser-supplied reference string — no cryptographic proof.
 *
 * TODO(payment-integrity): The correct fix is a Supabase Edge Function that:
 *   1. Receives Paystack webhook POSTs at a secret URL
 *   2. Validates the X-Paystack-Signature HMAC-SHA512 header using PAYSTACK_SECRET_KEY
 *   3. Only then updates payment status to "paid" in the DB
 * Until that exists, NO client-side path should write status="paid" for gateway payments.
 */
export async function handlePaymentCallback(
  paymentId: string,
  reference: string,
  status: "success" | "failed",
  _gatewayResponse: Record<string, unknown>
): Promise<boolean> {
  const { error } = await supabase
    .from("payments")
    .update({
      reference: reference,
      status: status === "success" ? "paid" : "failed",
      paid_at: status === "success" ? new Date().toISOString() : null,
    } as any)
    .eq("id", paymentId);

  if (error) {
    console.error("Failed to update payment with gateway response:", error);
    return false;
  }

  return true;
}

/**
 * Get supported gateways
 */
export function getSupportedGateways(): Array<{
  id: PaymentGateway;
  name: string;
  description: string;
  currencies: string[];
}> {
  return [
    {
      id: "paystack",
      name: "Paystack",
      description: "Accept payments with cards, bank transfers, and mobile money",
      currencies: ["NGN", "GHS", "ZAR", "USD"],
    },
    {
      id: "flutterwave",
      name: "Flutterwave",
      description: "Pan-African payment processing",
      currencies: ["NGN", "GHS", "KES", "ZAR", "USD", "GBP", "EUR"],
    },
  ];
}
