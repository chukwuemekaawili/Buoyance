import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface AuditLogEntry {
  action: string;
  entity_type: string;
  entity_id?: string;
  before_json?: Json;
  after_json?: Json;
  metadata?: Json;
}

/**
 * Writes an audit log entry for privileged actions.
 * This should be called for:
 * - Role changes
 * - Tax rules publish
 * - Filing creation/submission
 * - Payment record creation
 * - Exports
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn("Attempted to write audit log without authenticated user");
      return false;
    }

    const { error } = await supabase.from("audit_logs").insert([{
      actor_user_id: user.id,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      before_json: entry.before_json || null,
      after_json: entry.after_json || null,
      metadata: entry.metadata || null,
      user_agent: navigator.userAgent,
      ip_address: null, // Would need server-side to get real IP
    }]);

    if (error) {
      console.error("Failed to write audit log:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Audit log error:", err);
    return false;
  }
}

// Pre-defined action types for consistency
export const AuditActions = {
  // Role management
  ROLE_ASSIGNED: "role.assigned",
  ROLE_REMOVED: "role.removed",
  
  // Tax rules
  TAX_RULE_CREATED: "tax_rule.created",
  TAX_RULE_PUBLISHED: "tax_rule.published",
  TAX_RULE_UNPUBLISHED: "tax_rule.unpublished",
  TAX_RULE_UPDATED: "tax_rule.updated",
  TAX_RULE_ARCHIVED: "tax_rule.archived",
  
  // Filings
  FILING_CREATED: "filing.created",
  FILING_UPDATED: "filing.updated",
  FILING_SUBMITTED: "filing.submitted",
  FILING_DOCUMENT_GENERATED: "filing.document_generated",
  FILING_ARCHIVED: "filing.archived",
  
  // Payments
  PAYMENT_CREATED: "payment.created",
  PAYMENT_UPDATED: "payment.updated",
  PAYMENT_COMPLETED: "payment.completed",
  PAYMENT_ARCHIVED: "payment.archived",
  
  // Calculations
  CALCULATION_SAVED: "calculation.saved",
  CALCULATION_ARCHIVED: "calculation.archived",
  CALCULATION_EXPORTED: "calculation.exported",
  
  // Exports
  DATA_EXPORTED: "data.exported",
  AUDIT_EXPORTED: "audit.exported",
  
  // Consent
  CONSENT_ACCEPTED: "consent.accepted",
  
  // User management
  USER_PROFILE_UPDATED: "user.profile_updated",
  USER_ONBOARDING_COMPLETED: "user.onboarding_completed",
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];
