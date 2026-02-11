/**
 * Payment Gateway Service
 * 
 * Handles integration with payment providers (Paystack, Flutterwave).
 * Currently in stub mode - requires API keys to be functional.
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
 * Check if payment gateway is available
 */
export function isPaymentGatewayAvailable(): { 
  available: boolean; 
  gateway?: PaymentGateway; 
  reason?: string;
} {
  // In stub mode, return as unavailable
  return {
    available: false,
    reason: "Payment gateway integration requires API keys (PAYSTACK_SECRET_KEY or FLUTTERWAVE_SECRET_KEY).",
  };
}

/**
 * Initiate a payment (stub mode)
 */
export async function initiatePayment(
  paymentId: string,
  amountKobo: string,
  email: string,
  gateway: PaymentGateway = "paystack"
): Promise<InitiatePaymentResult> {
  const status = isPaymentGatewayAvailable();
  
  if (!status.available) {
    return {
      success: false,
      error: status.reason,
      isStubbed: true,
    };
  }

  // Would initiate payment with provider here
  return {
    success: false,
    error: "Payment gateway is not yet configured. Please use manual payment and upload receipt.",
    isStubbed: true,
  };
}

/**
 * Verify a payment (stub mode)
 */
export async function verifyPayment(
  reference: string,
  gateway: PaymentGateway = "paystack"
): Promise<VerifyPaymentResult> {
  return {
    success: false,
    error: "Payment verification requires active gateway integration.",
    isStubbed: true,
  };
}

/**
 * Handle payment callback
 */
export async function handlePaymentCallback(
  paymentId: string,
  reference: string,
  status: "success" | "failed",
  gatewayResponse: Record<string, unknown>
): Promise<boolean> {
  const { error } = await supabase
    .from("payments")
    .update({
      gateway_reference: reference,
      gateway_response: gatewayResponse as any,
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
