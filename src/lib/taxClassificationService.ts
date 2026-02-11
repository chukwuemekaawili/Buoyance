import { supabase } from "@/integrations/supabase/client";

export interface ClassificationResult {
  deductible?: boolean;
  tax_exempt?: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  legal_reference?: string;
}

export interface ClassifyRequest {
  type: 'expense' | 'income';
  description: string;
  category: string;
  amount_kobo?: string;
}

/**
 * AI-powered tax classification service
 * Analyzes expenses/incomes against Nigerian tax rules to determine tax treatment
 */
export async function classifyTaxItem(request: ClassifyRequest): Promise<ClassificationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('classify-tax-item', {
      body: request,
    });

    if (error) {
      console.error('Classification error:', error);
      return getFallbackClassification(request.type, request.category);
    }

    return data as ClassificationResult;
  } catch (err) {
    console.error('Failed to classify tax item:', err);
    return getFallbackClassification(request.type, request.category);
  }
}

// Fallback classification when AI is unavailable
function getFallbackClassification(type: 'expense' | 'income', category: string): ClassificationResult {
  if (type === 'expense') {
    const deductibleCategories = [
      'rent', 'salaries', 'utilities', 'power', 'marketing', 'transport',
      'cogs', 'professional', 'office', 'equipment', 'insurance',
      'maintenance', 'software', 'training'
    ];
    const isDeductible = deductibleCategories.includes(category);
    
    return {
      deductible: isDeductible,
      confidence: 'low',
      reasoning: isDeductible 
        ? 'Business expense - typically deductible.'
        : 'Personal expense - typically not deductible.',
      legal_reference: 'PITA/CITA Section 24'
    };
  } else {
    const exemptCategories = ['loan', 'gift', 'grant', 'refund'];
    const isExempt = exemptCategories.includes(category);
    
    return {
      tax_exempt: isExempt,
      confidence: 'low',
      reasoning: isExempt
        ? 'Generally exempt from tax.'
        : 'Subject to Personal Income Tax.',
      legal_reference: 'PITA Section 3'
    };
  }
}

// Confidence level colors for UI
export function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'text-green-600 dark:text-green-400';
    case 'medium':
      return 'text-amber-600 dark:text-amber-400';
    case 'low':
      return 'text-red-600 dark:text-red-400';
  }
}

export function getConfidenceBgColor(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'bg-green-500/10 border-green-500/20';
    case 'medium':
      return 'bg-amber-500/10 border-amber-500/20';
    case 'low':
      return 'bg-red-500/10 border-red-500/20';
  }
}
