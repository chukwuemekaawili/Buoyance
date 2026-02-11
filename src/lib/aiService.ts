/**
 * AI Service
 * 
 * Provides AI-powered explanations for tax calculations.
 * Uses Lovable AI Gateway when available, otherwise provides stub responses.
 * 
 * GUARDRAILS:
 * - Cannot change tax amounts
 * - Cannot submit filings
 * - Cannot override rules
 * - Must log all prompts and responses
 */

import { supabase } from "@/integrations/supabase/client";

export interface AIExplanationRequest {
  question: string;
  context: {
    taxType?: string;
    calculationType?: string;
    values?: Record<string, unknown>;
    ruleVersion?: string;
  };
}

export interface AIExplanationResponse {
  answer: string;
  isStubbed: boolean;
  explanationId?: string;
}

// Pre-defined explanations for common questions (stub mode)
const STUB_EXPLANATIONS: Record<string, string> = {
  "pit": `Personal Income Tax (PIT) in Nigeria is levied on the income of individuals, including employees and self-employed persons. The tax is progressive, with rates ranging from 7% to 24% based on income bands.

Key reliefs include:
• Consolidated Relief Allowance (CRA): Higher of ₦200,000 or 1% of gross income, plus 20% of gross income
• Pension contributions (up to 8% of gross emoluments)
• National Housing Fund contributions
• Life insurance premiums

PIT is governed by the Personal Income Tax Act (PITA) as amended.`,

  "cit": `Companies Income Tax (CIT) is charged on the profits of companies operating in Nigeria. The standard rate is 30% for large companies, with a reduced rate of 20% for small companies (turnover ≤ ₦25 million).

Key considerations:
• Companies with turnover over ₦50 billion may be subject to Minimum Effective Tax Rate (15%)
• Capital allowances are available for qualifying capital expenditure
• Losses can be carried forward indefinitely
• Pioneer status may provide tax holidays for qualifying industries

CIT is governed by the Companies Income Tax Act (CITA).`,

  "vat": `Value Added Tax (VAT) is a consumption tax charged on the supply of goods and services. The current rate is 7.5%.

Key points:
• Input VAT paid on purchases can be credited against output VAT
• Certain goods and services are VAT-exempt (basic food items, medical supplies, educational services)
• VAT returns are filed monthly
• Businesses with turnover above ₦25 million must register for VAT

VAT is governed by the Value Added Tax Act.`,

  "wht": `Withholding Tax (WHT) is an advance payment of income tax deducted at source on various payments. Rates vary by payment type:

• Dividends: 10%
• Interest: 10%
• Rent: 10%
• Royalties: 10%
• Professional fees: 10% (companies), 5% (individuals)
• Construction contracts: 5%

WHT is credited against the final tax liability of the recipient.`,

  "cgt": `Capital Gains Tax (CGT) is charged on gains from the disposal of chargeable assets. The rate is 10%.

Chargeable assets include:
• Land and buildings
• Stocks and shares
• Intangible assets (goodwill, patents)
• Foreign currency (in certain circumstances)

Exemptions may apply for:
• Disposal of Nigerian government securities
• Reinvestment relief (when proceeds are reinvested)
• Principal private residence (in some cases)

CGT is governed by the Capital Gains Tax Act.`,

  "default": `This is a general explanation about Nigerian tax law. For specific guidance, please consult with a qualified tax professional or refer to the relevant tax legislation.

The Federal Inland Revenue Service (FIRS) is responsible for federal taxes, while State Internal Revenue Services handle personal income tax for residents.

Key tax types in Nigeria include:
• Personal Income Tax (PIT)
• Companies Income Tax (CIT)
• Value Added Tax (VAT)
• Withholding Tax (WHT)
• Capital Gains Tax (CGT)
• Petroleum Profit Tax (PPT)`,
};

/**
 * Get explanation from AI or stub
 */
export async function getExplanation(request: AIExplanationRequest): Promise<AIExplanationResponse> {
  const { question, context } = request;

  // Determine which stub explanation to use based on context
  const taxType = context.taxType?.toLowerCase() || "";
  let answer = STUB_EXPLANATIONS[taxType] || STUB_EXPLANATIONS["default"];

  // Add context-specific intro
  if (question) {
    answer = `Regarding your question about ${context.taxType || "tax"}: "${question.slice(0, 100)}${question.length > 100 ? "..." : ""}"\n\n${answer}`;
  }

  // Add guardrail notice
  answer += `\n\n---\n*Note: This explanation is for informational purposes only. It does not alter your calculated tax amounts or constitute tax advice. Please consult a qualified tax professional for specific guidance.*`;

  // Log to database
  let explanationId: string | undefined;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("explanations")
        .insert({
          user_id: user.id,
          question,
          answer,
          context: context as any,
        } as any)
        .select("id")
        .single();
      
      explanationId = data?.id;
    }
  } catch (error) {
    console.error("Failed to log explanation:", error);
  }

  return {
    answer,
    isStubbed: true,
    explanationId,
  };
}

/**
 * Get explanation history for the current user
 */
export async function getExplanationHistory(limit = 20): Promise<Array<{
  id: string;
  question: string;
  answer: string;
  context: Record<string, unknown>;
  created_at: string;
}>> {
  const { data, error } = await supabase
    .from("explanations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch explanation history:", error);
    return [];
  }

  return data as any[];
}

/**
 * Check if AI is available (has API key configured)
 */
export function isAIAvailable(): boolean {
  // In stub mode, always return false
  // Would check for LOVABLE_API_KEY in production
  return false;
}

/**
 * Get quick explanation for a specific topic
 */
export function getQuickExplanation(topic: string): string {
  const normalized = topic.toLowerCase().trim();
  
  const quickExplanations: Record<string, string> = {
    "cra": "Consolidated Relief Allowance: Higher of ₦200,000 or 1% of gross income, plus 20% of gross income.",
    "effective rate": "The effective tax rate is the percentage of your total income that goes to taxes, calculated as total tax divided by gross income.",
    "small company": "Companies with annual turnover of ₦25 million or less qualify for the reduced CIT rate of 20%.",
    "vat rate": "The current VAT rate in Nigeria is 7.5%, effective from February 2020.",
    "pension relief": "Contributions to a Retirement Savings Account (RSA) are tax-deductible up to 8% of gross emoluments.",
    "capital allowance": "Tax relief for depreciation on qualifying capital assets used for business purposes.",
  };

  return quickExplanations[normalized] || "No quick explanation available for this topic.";
}
