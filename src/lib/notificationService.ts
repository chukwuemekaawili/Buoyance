/**
 * Notification Service
 * 
 * Handles creating, fetching, and managing user notifications.
 * Email sending is stubbed - requires RESEND_API_KEY to be configured.
 */

import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 
  | "filing_draft_created"
  | "filing_submitted" 
  | "payment_verified" 
  | "payment_rejected" 
  | "tax_rule_updated" 
  | "filing_overdue" 
  | "payment_due";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  email_sent: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a new notification for the current user
 */
export async function createNotification(input: CreateNotificationInput): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: user.id,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata || {},
      read: false,
      email_sent: false,
    } as any)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create notification:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Fetch all notifications for the current user
 */
export async function fetchNotifications(limit = 50): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }

  return data as Notification[];
}

/**
 * Fetch unread notification count
 */
export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false);

  if (error) {
    console.error("Failed to fetch unread count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Failed to mark notification as read:", error);
    return false;
  }

  return true;
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);

  if (error) {
    console.error("Failed to mark all as read:", error);
    return false;
  }

  return true;
}

/**
 * Trigger notifications for common events
 */
export const NotificationTriggers = {
  async filingDraftCreated(filingId: string, taxType: string): Promise<void> {
    await createNotification({
      type: "filing_draft_created",
      title: "Filing Draft Created",
      message: `Your ${taxType} filing draft has been created. Complete it to submit.`,
      metadata: { filing_id: filingId, tax_type: taxType },
    });
  },

  async filingSubmitted(filingId: string, taxType: string): Promise<void> {
    await createNotification({
      type: "filing_submitted",
      title: "Filing Submitted",
      message: `Your ${taxType} filing has been submitted successfully.`,
      metadata: { filing_id: filingId, tax_type: taxType },
    });
  },

  async paymentVerified(paymentId: string, amount: string): Promise<void> {
    await createNotification({
      type: "payment_verified",
      title: "Payment Verified",
      message: `Your payment of ${amount} has been verified.`,
      metadata: { payment_id: paymentId },
    });
  },

  async paymentRejected(paymentId: string, reason?: string): Promise<void> {
    await createNotification({
      type: "payment_rejected",
      title: "Payment Rejected",
      message: reason || "Your payment could not be verified. Please check your receipt.",
      metadata: { payment_id: paymentId },
    });
  },

  async taxRuleUpdated(taxType: string, version: string): Promise<void> {
    await createNotification({
      type: "tax_rule_updated",
      title: "Tax Rules Updated",
      message: `${taxType} tax rules have been updated to version ${version}.`,
      metadata: { tax_type: taxType, version },
    });
  },

  async filingOverdue(filingId: string, taxType: string, periodEnd: string): Promise<void> {
    await createNotification({
      type: "filing_overdue",
      title: "Filing Overdue",
      message: `Your ${taxType} filing for period ending ${periodEnd} is overdue.`,
      metadata: { filing_id: filingId, tax_type: taxType, period_end: periodEnd },
    });
  },

  async paymentDue(filingId: string, amount: string, dueDate: string): Promise<void> {
    await createNotification({
      type: "payment_due",
      title: "Payment Due",
      message: `Payment of ${amount} is due by ${dueDate}.`,
      metadata: { filing_id: filingId, amount, due_date: dueDate },
    });
  },
};

/**
 * Email sending adapter - STUBBED
 * Requires edge function with RESEND_API_KEY to be functional
 */
export async function sendNotificationEmail(
  _notificationId: string,
  _userEmail: string
): Promise<{ success: boolean; stubbed: boolean }> {
  // This is a stub - actual email sending requires:
  // 1. Edge function with Resend integration
  // 2. RESEND_API_KEY secret configured
  console.log("[STUB] Email sending not configured. Would send notification email.");
  
  return { success: false, stubbed: true };
}
