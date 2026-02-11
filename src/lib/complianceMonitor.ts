/**
 * Compliance Monitor
 * 
 * Monitors user's tax compliance status and generates alerts
 * for overdue filings, upcoming deadlines, pending payments, and rule changes.
 */

import { supabase } from "@/integrations/supabase/client";

export type AlertLevel = "critical" | "warning" | "info";

export interface ComplianceAlert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  actionLabel?: string;
  actionPath?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

interface Filing {
  id: string;
  status: string;
  period_end: string;
  submitted_at: string | null;
  tax_type: string;
  created_at: string;
}

interface Payment {
  id: string;
  status: string;
  verification_status: string;
  amount_kobo: string;
  filing_id: string;
  created_at: string;
}

/**
 * Check if a filing is overdue (past period_end + 30 days grace)
 */
function isOverdue(periodEnd: string, submittedAt: string | null): boolean {
  if (submittedAt) return false;
  
  const deadline = new Date(periodEnd);
  deadline.setDate(deadline.getDate() + 30);
  
  return new Date() > deadline;
}

/**
 * Check if a filing deadline is upcoming (within 14 days)
 */
function isUpcoming(periodEnd: string, submittedAt: string | null): number {
  if (submittedAt) return -1;
  
  const deadline = new Date(periodEnd);
  deadline.setDate(deadline.getDate() + 30);
  
  const now = new Date();
  const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysUntilDeadline >= 0 && daysUntilDeadline <= 14 ? daysUntilDeadline : -1;
}

/**
 * Generate compliance alerts from user data
 */
export async function generateComplianceAlerts(): Promise<ComplianceAlert[]> {
  const alerts: ComplianceAlert[] = [];
  
  try {
    // Fetch user's filings
    const { data: filings } = await supabase
      .from("filings")
      .select("id, status, period_end, submitted_at, tax_type, created_at")
      .eq("archived", false)
      .order("period_end", { ascending: false });

    // Fetch user's payments
    const { data: payments } = await supabase
      .from("payments")
      .select("id, status, verification_status, amount_kobo, filing_id, created_at")
      .eq("archived", false);

    const filingsData = (filings || []) as Filing[];
    const paymentsData = (payments || []) as Payment[];

    // Check for overdue filings (CRITICAL)
    for (const filing of filingsData) {
      if (filing.status === "draft" && isOverdue(filing.period_end, filing.submitted_at)) {
        alerts.push({
          id: `overdue-${filing.id}`,
          level: "critical",
          title: "Overdue Filing",
          message: `Your ${filing.tax_type} filing for period ending ${new Date(filing.period_end).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} is overdue.`,
          actionLabel: "Complete Filing",
          actionPath: `/filings/${filing.id}`,
          metadata: { filing_id: filing.id, tax_type: filing.tax_type },
          createdAt: new Date(),
        });
      }
    }

    // Check for upcoming deadlines (WARNING)
    for (const filing of filingsData) {
      if (filing.status === "draft") {
        const daysUntil = isUpcoming(filing.period_end, filing.submitted_at);
        if (daysUntil >= 0) {
          alerts.push({
            id: `upcoming-${filing.id}`,
            level: "warning",
            title: "Upcoming Deadline",
            message: `Your ${filing.tax_type} filing is due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}.`,
            actionLabel: "View Filing",
            actionPath: `/filings/${filing.id}`,
            metadata: { filing_id: filing.id, tax_type: filing.tax_type, days_until: daysUntil },
            createdAt: new Date(),
          });
        }
      }
    }

    // Check for pending payments (WARNING)
    const pendingPayments = paymentsData.filter(p => p.status === "pending");
    if (pendingPayments.length > 0) {
      alerts.push({
        id: `pending-payments-${pendingPayments.length}`,
        level: "warning",
        title: "Pending Payments",
        message: `You have ${pendingPayments.length} payment${pendingPayments.length > 1 ? "s" : ""} awaiting completion or verification.`,
        actionLabel: "View Payments",
        actionPath: "/payments",
        metadata: { count: pendingPayments.length },
        createdAt: new Date(),
      });
    }

    // Check for rejected payments (CRITICAL)
    const rejectedPayments = paymentsData.filter(p => p.verification_status === "rejected");
    if (rejectedPayments.length > 0) {
      alerts.push({
        id: `rejected-payments-${rejectedPayments.length}`,
        level: "critical",
        title: "Payment Verification Failed",
        message: `${rejectedPayments.length} payment${rejectedPayments.length > 1 ? "s have" : " has"} been rejected. Please resubmit with valid receipts.`,
        actionLabel: "Review Payments",
        actionPath: "/payments",
        metadata: { count: rejectedPayments.length },
        createdAt: new Date(),
      });
    }

    // Sort by level priority: critical > warning > info
    const levelPriority = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => levelPriority[a.level] - levelPriority[b.level]);

  } catch (error) {
    console.error("Failed to generate compliance alerts:", error);
  }

  return alerts;
}

/**
 * Get compliance summary stats
 */
export async function getComplianceSummary(): Promise<{
  overdueCount: number;
  upcomingCount: number;
  pendingPayments: number;
  complianceRate: number;
}> {
  const alerts = await generateComplianceAlerts();
  
  const overdueCount = alerts.filter(a => a.id.startsWith("overdue-")).length;
  const upcomingCount = alerts.filter(a => a.id.startsWith("upcoming-")).length;
  const pendingPayments = alerts.filter(a => a.id.startsWith("pending-")).length;
  
  // Calculate compliance rate
  const { count: totalFilings } = await supabase
    .from("filings")
    .select("*", { count: "exact", head: true })
    .eq("archived", false);

  const { count: submittedFilings } = await supabase
    .from("filings")
    .select("*", { count: "exact", head: true })
    .eq("archived", false)
    .in("status", ["submitted", "accepted"]);

  const complianceRate = totalFilings && totalFilings > 0 
    ? Math.round(((submittedFilings || 0) / totalFilings) * 100) 
    : 100;

  return {
    overdueCount,
    upcomingCount,
    pendingPayments,
    complianceRate,
  };
}
