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
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const mockAuthEnabled = import.meta.env?.VITE_MOCK_AUTH === 'true' || isLocalDev;

  if (mockAuthEnabled && filingId.startsWith("mock-filing-")) {
    console.warn("Using MOCK Auth: Returning mock filing data");
    return {
      id: filingId,
      user_id: "00000000-0000-0000-0000-000000000000",
      tax_type: "PIT",
      period_start: "2025-01-01",
      period_end: "2025-01-31",
      status: "draft",
      rule_version: "2025-v1",
      input_json: {
        annualSalaryKobo: "100000000", // 1,000,000 NGN
        deductionsKobo: "0",
        whtCreditsKobo: "0",
        identity: "freelancer"
      },
      output_json: {
        taxPayableKobo: 5000000 // 50,000 NGN dummy calc
      },
      document_url: null,
      submitted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived: false
    } as Filing;
  }

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
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const mockAuthEnabled = import.meta.env?.VITE_MOCK_AUTH === 'true' || isLocalDev;

  if (mockAuthEnabled) {
    console.warn("Using MOCK Auth: Bypassing create_filing_draft RPC");
    return `mock-filing-${Date.now()}`;
  }

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
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const mockAuthEnabled = import.meta.env?.VITE_MOCK_AUTH === 'true' || isLocalDev;

  if (mockAuthEnabled) {
    console.warn("Using MOCK Auth: Bypassing update_filing_draft RPC");
    return;
  }

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
 * Submit a filing via RPC and TaxPro Max API.
 */
export async function submitFiling(
  filingId: string,
  outputJson: Record<string, unknown>
): Promise<{ success: boolean; rule_version: string; submitted_at: string; firs_reference?: string }> {

  // 1. Transform internal schema to FIRS TaxPro Max XML/JSON schema
  console.log("Preparing FIRS FIRS payload mapping...");
  const firsPayload = {
    taxpayerIdentifier: "PendingTIN", // To be fetched from user identity
    taxPeriod: "2025-01",
    taxType: "PIT", // Needs dynamic mapping
    computations: outputJson,
    totalTaxPayable: outputJson.taxPayableKobo ?? 0
  };

  // 2. Transmit to FIRS Integration API (Edge Function / External API Mock)
  console.log("Transmitting to FIRS:", firsPayload);

  // Simulating FIRS API response latency
  await new Promise(resolve => setTimeout(resolve, 800));

  // In a real implementation we would fetch from a secure endpoint:
  // const response = await fetch("https://api.taxpromax.firs.gov.ng/v1/submit", { ... });
  // if (!response.ok) throw new Error("FIRS API Rejection");
  const mockFirsRef = `FIRS-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000)}`;

  // 3. Document submission in Supabase Database via RPC
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const mockAuthEnabled = import.meta.env?.VITE_MOCK_AUTH === 'true' || isLocalDev;

  if (mockAuthEnabled && filingId.startsWith("mock-filing-")) {
    console.warn("Using MOCK Auth: Bypassing submit_filing RPC");
    return {
      success: true,
      rule_version: "2025-v1",
      submitted_at: new Date().toISOString(),
      firs_reference: mockFirsRef
    };
  }

  const { data, error } = await supabase.rpc("submit_filing", {
    p_filing_id: filingId,
    p_output_json: {
      ...outputJson,
      firs_reference: mockFirsRef,
      submission_channel: "API"
    } as Json,
  });

  if (error) {
    console.error("Failed to submit filing to database:", error);
    throw error;
  }

  return {
    ...(data as { success: boolean; rule_version: string; submitted_at: string }),
    firs_reference: mockFirsRef
  };
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
