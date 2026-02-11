/**
 * NRS (Nigeria Revenue Service) Filing Service
 * 
 * Handles submission of filings to the tax authority.
 * Currently in stub mode - requires NRS API integration.
 */

import { supabase } from "@/integrations/supabase/client";

export type NRSStatus = "pending" | "submitted" | "accepted" | "rejected" | "error";

export interface NRSSubmissionResult {
  success: boolean;
  nrsReference?: string;
  nrsStatus?: NRSStatus;
  message?: string;
  isStubbed: boolean;
  submittedAt?: string;
}

export interface NRSFilingStatus {
  filingId: string;
  nrsReference: string | null;
  nrsStatus: NRSStatus | null;
  nrsSubmittedAt: string | null;
}

/**
 * Check if NRS integration is available
 */
export function isNRSAvailable(): { available: boolean; reason?: string } {
  // In stub mode, return as unavailable
  return {
    available: false,
    reason: "NRS e-Filing integration requires API configuration with the Nigeria Revenue Service.",
  };
}

/**
 * Submit a filing to NRS (stub mode)
 */
export async function submitToNRS(filingId: string): Promise<NRSSubmissionResult> {
  // Verify the filing exists and is submitted
  const { data: filing, error: fetchError } = await supabase
    .from("filings")
    .select("id, status, tax_type, nrs_status")
    .eq("id", filingId)
    .single();

  if (fetchError || !filing) {
    return {
      success: false,
      message: "Filing not found",
      isStubbed: true,
    };
  }

  if (filing.status !== "submitted" && filing.status !== "accepted") {
    return {
      success: false,
      message: "Only submitted or accepted filings can be sent to NRS",
      isStubbed: true,
    };
  }

  if (filing.nrs_status === "submitted" || filing.nrs_status === "accepted") {
    return {
      success: false,
      message: "Filing has already been submitted to NRS",
      isStubbed: true,
    };
  }

  // Generate a stub NRS reference
  const stubReference = `NRS-STUB-${filing.tax_type}-${Date.now().toString(36).toUpperCase()}`;
  const submittedAt = new Date().toISOString();

  // Update the filing with stub NRS data
  const { error: updateError } = await supabase
    .from("filings")
    .update({
      nrs_reference: stubReference,
      nrs_status: "pending",
      nrs_submitted_at: submittedAt,
    } as any)
    .eq("id", filingId);

  if (updateError) {
    console.error("Failed to update filing with NRS status:", updateError);
    return {
      success: false,
      message: "Failed to record NRS submission",
      isStubbed: true,
    };
  }

  // Log audit event
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("audit_logs").insert({
      actor_user_id: user.id,
      action: "filing.nrs_submitted",
      entity_type: "filing",
      entity_id: filingId,
      metadata: {
        nrs_reference: stubReference,
        stubbed: true,
      },
    } as any);
  }

  return {
    success: true,
    nrsReference: stubReference,
    nrsStatus: "pending",
    message: "[STUB] Filing queued for NRS submission. Actual submission requires NRS API integration.",
    isStubbed: true,
    submittedAt,
  };
}

/**
 * Check the status of an NRS submission
 */
export async function checkNRSStatus(filingId: string): Promise<NRSFilingStatus | null> {
  const { data, error } = await supabase
    .from("filings")
    .select("id, nrs_reference, nrs_status, nrs_submitted_at")
    .eq("id", filingId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    filingId: data.id,
    nrsReference: (data as any).nrs_reference,
    nrsStatus: (data as any).nrs_status,
    nrsSubmittedAt: (data as any).nrs_submitted_at,
  };
}

/**
 * Get all filings with NRS submission status
 */
export async function getFilingsWithNRSStatus(): Promise<NRSFilingStatus[]> {
  const { data, error } = await supabase
    .from("filings")
    .select("id, nrs_reference, nrs_status, nrs_submitted_at")
    .not("nrs_reference", "is", null)
    .order("nrs_submitted_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch NRS statuses:", error);
    return [];
  }

  return data.map((d: any) => ({
    filingId: d.id,
    nrsReference: d.nrs_reference,
    nrsStatus: d.nrs_status,
    nrsSubmittedAt: d.nrs_submitted_at,
  }));
}
