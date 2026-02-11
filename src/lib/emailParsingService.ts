/**
 * Email Parsing Service
 * 
 * Parses receipt emails and extracts structured data.
 * Uses deterministic regex-based parsing for common receipt formats.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ParsedEmailData {
  vendor?: string;
  amount?: string;
  currency?: string;
  date?: string;
  reference?: string;
  description?: string;
  category?: string;
  taxId?: string;
  rawFields: Record<string, string>;
}

export interface ParseEmailResult {
  success: boolean;
  data?: ParsedEmailData;
  emailId?: string;
  error?: string;
}

// Common patterns for extracting receipt data
const PATTERNS = {
  amount: [
    /(?:Amount|Total|Sum|Payment|Paid|Price)[:\s]+(?:NGN|₦|N)?\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:NGN|₦|N)\s*([\d,]+(?:\.\d{2})?)/i,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:NGN|Naira)/i,
  ],
  date: [
    /(?:Date|On|When|Paid on)[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i,
    /(\d{4}-\d{2}-\d{2})/,
  ],
  reference: [
    /(?:Ref|Reference|Trans ID|Transaction ID|Receipt No|Receipt Number)[:\s#]+([A-Z0-9\-]+)/i,
    /(?:#|No\.?)[:\s]?([A-Z0-9\-]{6,})/i,
  ],
  vendor: [
    /(?:From|Merchant|Vendor|Seller|Paid to|Company)[:\s]+([^\n]+)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Receipt|Invoice)/m,
  ],
  description: [
    /(?:For|Description|Purpose|Narration)[:\s]+([^\n]+)/i,
    /(?:Item|Product|Service)[:\s]+([^\n]+)/i,
  ],
  taxId: [
    /(?:TIN|Tax ID|VAT Reg|VAT Number)[:\s]+([A-Z0-9\-]+)/i,
  ],
};

/**
 * Parse email content and extract receipt data
 */
export function parseEmailContent(content: string): ParsedEmailData {
  const rawFields: Record<string, string> = {};
  const result: ParsedEmailData = { rawFields };

  // Extract amount
  for (const pattern of PATTERNS.amount) {
    const match = content.match(pattern);
    if (match) {
      result.amount = match[1].replace(/,/g, "");
      result.currency = "NGN";
      rawFields.amount_match = match[0];
      break;
    }
  }

  // Extract date
  for (const pattern of PATTERNS.date) {
    const match = content.match(pattern);
    if (match) {
      result.date = match[1];
      rawFields.date_match = match[0];
      break;
    }
  }

  // Extract reference
  for (const pattern of PATTERNS.reference) {
    const match = content.match(pattern);
    if (match) {
      result.reference = match[1];
      rawFields.reference_match = match[0];
      break;
    }
  }

  // Extract vendor
  for (const pattern of PATTERNS.vendor) {
    const match = content.match(pattern);
    if (match) {
      result.vendor = match[1].trim();
      rawFields.vendor_match = match[0];
      break;
    }
  }

  // Extract description
  for (const pattern of PATTERNS.description) {
    const match = content.match(pattern);
    if (match) {
      result.description = match[1].trim();
      rawFields.description_match = match[0];
      break;
    }
  }

  // Extract tax ID
  for (const pattern of PATTERNS.taxId) {
    const match = content.match(pattern);
    if (match) {
      result.taxId = match[1];
      rawFields.taxid_match = match[0];
      break;
    }
  }

  // Try to categorize based on keywords
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes("tax") || lowerContent.includes("firs") || lowerContent.includes("revenue")) {
    result.category = "tax_payment";
  } else if (lowerContent.includes("salary") || lowerContent.includes("payroll")) {
    result.category = "salary";
  } else if (lowerContent.includes("rent") || lowerContent.includes("lease")) {
    result.category = "rent";
  } else if (lowerContent.includes("utility") || lowerContent.includes("electricity") || lowerContent.includes("water")) {
    result.category = "utilities";
  } else if (lowerContent.includes("purchase") || lowerContent.includes("buy")) {
    result.category = "purchase";
  }

  return result;
}

/**
 * Parse email and save to database
 */
export async function parseAndSaveEmail(
  subject: string,
  content: string
): Promise<ParseEmailResult> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      success: false,
      error: "Not authenticated",
    };
  }

  const parsedData = parseEmailContent(content);

  const { data, error } = await supabase
    .from("parsed_emails")
    .insert({
      user_id: user.id,
      email_subject: subject,
      parsed_data: parsedData as any,
    } as any)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save parsed email:", error);
    return {
      success: false,
      error: "Failed to save parsed email",
    };
  }

  return {
    success: true,
    data: parsedData,
    emailId: data?.id,
  };
}

/**
 * Get parsed emails for the current user
 */
export async function getParsedEmails(limit = 50): Promise<Array<{
  id: string;
  email_subject: string | null;
  parsed_data: ParsedEmailData;
  created_at: string;
}>> {
  const { data, error } = await supabase
    .from("parsed_emails")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch parsed emails:", error);
    return [];
  }

  return data as any[];
}
