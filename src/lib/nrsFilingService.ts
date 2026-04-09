/**
 * NRS (Nigeria Revenue Service) Filing Service
 * 
 * Tracks authority-submission metadata when Buoyance eventually supports it.
 * Direct authority submission is not currently enabled.
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
  return {
    available: false,
    reason: "Direct tax-authority submission is not currently enabled in Buoyance. Use the manual filing workflow and store any external reference separately.",
  };
}

/**
 * Direct submission is intentionally unavailable until a real authority integration exists.
 */
export async function submitToNRS(filingId: string): Promise<NRSSubmissionResult> {
  // Verify the filing exists and is prepared
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
      message: "Only prepared or accepted filings can be referenced for external authority follow-up.",
      isStubbed: false,
    };
  }

  if (filing.nrs_status === "submitted" || filing.nrs_status === "accepted") {
    return {
      success: false,
      message: "An external authority reference already exists for this filing.",
      isStubbed: false,
    };
  }

  return {
    success: false,
    message: "Direct submission to the tax authority is not available in Buoyance yet. File externally and record the authority reference through your manual workflow.",
    isStubbed: false,
  };
}

/**
 * Check the stored status of an external authority reference
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
 * Get all filings with stored authority-submission metadata
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
