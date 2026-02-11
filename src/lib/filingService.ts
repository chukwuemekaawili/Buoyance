/**
 * Filing Service
 * Handles all filing CRUD operations via Supabase RPC and direct queries.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface Filing {
  id: string;
  user_id: string;
  tax_type: "PIT" | "CIT" | "VAT" | "WHT" | "CGT";
  period_start: string;
  period_end: string;
  status: "draft" | "submitted" | "accepted" | "rejected" | "cancelled";
  rule_version: string;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown>;
  document_url: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  archived: boolean;
}

export interface FilingEvent {
  id: string;
  filing_id: string;
  user_id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type FilingStatus = Filing["status"];
export type TaxType = Filing["tax_type"];

/**
 * Fetch all filings for the current user.
 */
export async function fetchUserFilings(
  status?: FilingStatus | "all"
): Promise<Filing[]> {
  let query = supabase
    .from("filings")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch filings:", error);
    throw error;
  }

  return (data || []) as unknown as Filing[];
}

/**
 * Fetch a single filing by ID.
 */
export async function fetchFilingById(filingId: string): Promise<Filing | null> {
  const { data, error } = await supabase
    .from("filings")
    .select("*")
    .eq("id", filingId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("Failed to fetch filing:", error);
    throw error;
  }

  return data as unknown as Filing;
}

/**
 * Create a new draft filing via RPC.
 */
export async function createFilingDraft(params: {
  taxType: TaxType;
  periodStart: string;
  periodEnd: string;
  inputJson: Record<string, unknown>;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_filing_draft", {
    p_tax_type: params.taxType,
    p_period_start: params.periodStart,
    p_period_end: params.periodEnd,
    p_input_json: params.inputJson as Json,
  });

  if (error) {
    console.error("Failed to create filing draft:", error);
    throw error;
  }

  return data as string;
}

/**
 * Update an existing draft filing via RPC.
 */
export async function updateFilingDraft(
  filingId: string,
  inputJson: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.rpc("update_filing_draft", {
    p_filing_id: filingId,
    p_input_json: inputJson as Json,
  });

  if (error) {
    console.error("Failed to update filing draft:", error);
    throw error;
  }
}

/**
 * Submit a filing via RPC.
 */
export async function submitFiling(
  filingId: string,
  outputJson: Record<string, unknown>
): Promise<{ success: boolean; rule_version: string; submitted_at: string }> {
  const { data, error } = await supabase.rpc("submit_filing", {
    p_filing_id: filingId,
    p_output_json: outputJson as Json,
  });

  if (error) {
    console.error("Failed to submit filing:", error);
    throw error;
  }

  return data as { success: boolean; rule_version: string; submitted_at: string };
}

/**
 * Update filing document URL after PDF upload.
 */
export async function updateFilingDocument(
  filingId: string,
  documentUrl: string
): Promise<void> {
  const { error } = await supabase.rpc("update_filing_document", {
    p_filing_id: filingId,
    p_document_url: documentUrl,
  });

  if (error) {
    console.error("Failed to update filing document:", error);
    throw error;
  }
}

/**
 * Archive a filing (set archived=true).
 */
export async function archiveFiling(filingId: string): Promise<void> {
  const { error } = await supabase
    .from("filings")
    .update({ archived: true })
    .eq("id", filingId);

  if (error) {
    console.error("Failed to archive filing:", error);
    throw error;
  }
}

/**
 * Fetch events for a filing.
 */
export async function fetchFilingEvents(filingId: string): Promise<FilingEvent[]> {
  const { data, error } = await supabase
    .from("filing_events")
    .select("*")
    .eq("filing_id", filingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch filing events:", error);
    throw error;
  }

  return (data || []) as unknown as FilingEvent[];
}

/**
 * Upload filing PDF to storage and return URL.
 */
export async function uploadFilingPDF(
  userId: string,
  filingId: string,
  pdfBlob: Blob
): Promise<string> {
  const filePath = `${userId}/${filingId}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("filing-documents")
    .upload(filePath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("Failed to upload PDF:", uploadError);
    throw uploadError;
  }

  // Get signed URL (private bucket)
  const { data: urlData, error: urlError } = await supabase.storage
    .from("filing-documents")
    .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

  if (urlError) {
    console.error("Failed to get signed URL:", urlError);
    throw urlError;
  }

  return urlData.signedUrl;
}

/**
 * Get download URL for filing document.
 */
export async function getFilingDocumentUrl(
  userId: string,
  filingId: string
): Promise<string | null> {
  const filePath = `${userId}/${filingId}.pdf`;

  const { data, error } = await supabase.storage
    .from("filing-documents")
    .createSignedUrl(filePath, 60 * 60); // 1 hour

  if (error) {
    console.error("Failed to get document URL:", error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Get count of user filings.
 */
export async function getFilingsCount(
  status?: FilingStatus
): Promise<{ total: number; submitted: number }> {
  const { data: allData, error: allError } = await supabase
    .from("filings")
    .select("id, status", { count: "exact" });

  if (allError) throw allError;

  const total = allData?.length || 0;
  const submitted = allData?.filter((f) => f.status === "submitted").length || 0;

  return { total, submitted };
}
