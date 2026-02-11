/**
 * Tax Health Calculator
 * 
 * Computes a deterministic health score (0-100) based on:
 * - Identity (+30): Profile tax_identity set AND TIN is valid 10 digits
 * - Activity (+20): Has income OR expense records in current month
 * - Compliance (+50): Last filing is Submitted AND balance is 0
 * 
 * Uses Africa/Lagos timezone for date calculations.
 */

import { stringToKobo, addKobo, isZeroKobo } from "@/lib/money";

export interface ProfileData {
  tax_identity: string | null;
  tin: string | null;
}

export interface FilingData {
  id: string;
  status: string;
  period_end: string;
  submitted_at: string | null;
  created_at: string;
  tax_type: string;
  total_tax_kobo?: string; // Tax due from output_json
}

export interface PaymentData {
  id: string;
  filing_id: string;
  amount_kobo: string;
  status: string;
}

export interface ActivityData {
  hasRecentIncome: boolean;
  hasRecentExpense: boolean;
}

export interface TaxHealthInput {
  profile: ProfileData | null;
  filings: FilingData[];
  payments: PaymentData[];
  activity: ActivityData;
}

export interface TaxHealthFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  score: number;
  description: string;
  maxScore: number;
}

export interface TaxHealthResult {
  score: number;
  status: "excellent" | "good" | "fair" | "needs_attention" | "critical";
  statusLabel: string;
  statusColor: string;
  factors: TaxHealthFactor[];
  recommendations: string[];
}

const STATUS_CONFIG = {
  excellent: { label: "Excellent", color: "text-success", bgColor: "bg-success/10", minScore: 90 },
  good: { label: "Good", color: "text-success", bgColor: "bg-success/10", minScore: 75 },
  fair: { label: "Fair", color: "text-amber-500", bgColor: "bg-amber-500/10", minScore: 50 },
  needs_attention: { label: "Needs Attention", color: "text-amber-600", bgColor: "bg-amber-600/10", minScore: 25 },
  critical: { label: "Critical", color: "text-destructive", bgColor: "bg-destructive/10", minScore: 0 },
} as const;

/**
 * Validate TIN: must be exactly 10 digits
 */
function isValidTIN(tin: string | null): boolean {
  if (!tin) return false;
  return /^\d{10}$/.test(tin.trim());
}

/**
 * Get the start of current month in Africa/Lagos timezone
 */
function getStartOfMonthLagos(): Date {
  // Create date in Lagos timezone
  const now = new Date();
  const lagosOffset = 1 * 60; // UTC+1 in minutes
  const utcOffset = now.getTimezoneOffset();
  const lagosTime = new Date(now.getTime() + (lagosOffset + utcOffset) * 60 * 1000);
  
  return new Date(lagosTime.getFullYear(), lagosTime.getMonth(), 1);
}

/**
 * Get the last filing for a user (by submitted_at desc, then created_at desc)
 */
function getLastFiling(filings: FilingData[]): FilingData | null {
  if (filings.length === 0) return null;
  
  const sorted = [...filings].sort((a, b) => {
    // First by submitted_at desc (nulls last)
    if (a.submitted_at && b.submitted_at) {
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    }
    if (a.submitted_at && !b.submitted_at) return -1;
    if (!a.submitted_at && b.submitted_at) return 1;
    
    // Then by created_at desc
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  
  return sorted[0];
}

/**
 * Calculate balance for a filing (total_tax - sum of payments)
 */
function calculateFilingBalance(filing: FilingData, payments: PaymentData[]): bigint {
  const totalTaxKobo = filing.total_tax_kobo ? stringToKobo(filing.total_tax_kobo) : 0n;
  
  const paidKobo = payments
    .filter(p => p.filing_id === filing.id && p.status === "paid")
    .reduce((sum, p) => addKobo(sum, stringToKobo(p.amount_kobo)), 0n);
  
  const balance = totalTaxKobo - paidKobo;
  return balance > 0n ? balance : 0n;
}

/**
 * Calculate tax health score with deterministic logic
 * Starts at 0 and adds points based on rules
 */
export function calculateTaxHealth(input: TaxHealthInput): TaxHealthResult {
  const factors: TaxHealthFactor[] = [];
  const recommendations: string[] = [];
  
  // Start at 0 (not 100)
  let score = 0;
  
  const { profile, filings, payments, activity } = input;
  
  // ============================================
  // Factor 1: Identity (+30 points)
  // Requires: tax_identity IS NOT NULL AND TIN matches ^\d{10}$
  // ============================================
  const hasTaxIdentity = profile?.tax_identity !== null && profile?.tax_identity !== undefined && profile?.tax_identity !== '';
  const hasValidTIN = isValidTIN(profile?.tin || null);
  const identityComplete = hasTaxIdentity && hasValidTIN;
  
  if (identityComplete) {
    score += 30;
    factors.push({
      name: "Tax Identity",
      impact: "positive",
      score: 30,
      maxScore: 30,
      description: "Profile complete with valid TIN",
    });
  } else {
    factors.push({
      name: "Tax Identity",
      impact: "negative",
      score: 0,
      maxScore: 30,
      description: hasTaxIdentity 
        ? "TIN not set or invalid (must be 10 digits)"
        : "Tax identity not configured",
    });
    
    if (!hasTaxIdentity) {
      recommendations.push("Set your tax identity type (Freelancer, Business, or Employee) in Settings");
    }
    if (!hasValidTIN) {
      recommendations.push("Enter your valid 10-digit JTB Tax Identification Number");
    }
  }
  
  // ============================================
  // Factor 2: Activity (+20 points)
  // Requires: income OR expense records in current month
  // ============================================
  const hasRecentActivity = activity.hasRecentIncome || activity.hasRecentExpense;
  
  if (hasRecentActivity) {
    score += 20;
    factors.push({
      name: "Recent Activity",
      impact: "positive",
      score: 20,
      maxScore: 20,
      description: "Income or expense records this month",
    });
  } else {
    factors.push({
      name: "Recent Activity",
      impact: "negative",
      score: 0,
      maxScore: 20,
      description: "No income or expense records this month",
    });
    recommendations.push("Add your income and expense records for the current month");
  }
  
  // ============================================
  // Factor 3: Compliance (+50 points)
  // Requires: LAST filing status == 'submitted' AND balance == 0
  // ============================================
  const lastFiling = getLastFiling(filings);
  
  if (!lastFiling) {
    factors.push({
      name: "Compliance",
      impact: "neutral",
      score: 0,
      maxScore: 50,
      description: "No filings yet",
    });
    recommendations.push("Create your first tax filing to start tracking compliance");
  } else {
    const isSubmitted = lastFiling.status === "submitted" || lastFiling.status === "accepted";
    const balance = calculateFilingBalance(lastFiling, payments);
    const isPaid = isZeroKobo(balance);
    
    if (isSubmitted && isPaid) {
      score += 50;
      factors.push({
        name: "Compliance",
        impact: "positive",
        score: 50,
        maxScore: 50,
        description: "Latest filing submitted and fully paid",
      });
    } else if (isSubmitted && !isPaid) {
      // Partial credit for submitted but unpaid
      score += 25;
      factors.push({
        name: "Compliance",
        impact: "neutral",
        score: 25,
        maxScore: 50,
        description: "Latest filing submitted but has outstanding balance",
      });
      recommendations.push("Complete payment for your submitted filing");
    } else {
      // Draft filing
      factors.push({
        name: "Compliance",
        impact: "negative",
        score: 0,
        maxScore: 50,
        description: `Latest filing is in ${lastFiling.status} status`,
      });
      recommendations.push("Submit your draft filing to improve compliance");
    }
  }
  
  // Clamp score
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  // Determine status
  let status: TaxHealthResult["status"];
  if (score >= STATUS_CONFIG.excellent.minScore) {
    status = "excellent";
  } else if (score >= STATUS_CONFIG.good.minScore) {
    status = "good";
  } else if (score >= STATUS_CONFIG.fair.minScore) {
    status = "fair";
  } else if (score >= STATUS_CONFIG.needs_attention.minScore) {
    status = "needs_attention";
  } else {
    status = "critical";
  }
  
  return {
    score,
    status,
    statusLabel: STATUS_CONFIG[status].label,
    statusColor: STATUS_CONFIG[status].color,
    factors,
    recommendations: recommendations.slice(0, 3),
  };
}

export function getStatusConfig(status: TaxHealthResult["status"]) {
  return STATUS_CONFIG[status];
}
