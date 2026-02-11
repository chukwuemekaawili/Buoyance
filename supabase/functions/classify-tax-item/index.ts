import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

interface ClassifyRequest {
  type: 'expense' | 'income';
  description: string;
  category: string;
  amount_kobo?: string;
}

interface ClassifyResponse {
  deductible?: boolean;
  tax_exempt?: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  legal_reference?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { type, description, category, amount_kobo } = await req.json() as ClassifyRequest;

    if (!type || !description || !category) {
      return new Response(
        JSON.stringify({ error: 'type, description, and category are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch relevant tax rules from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch classification rules from the new table
    const { data: classificationRules } = await supabase
      .from('classification_rules')
      .select('*')
      .eq('rule_type', type);

    // Fetch tax rules for additional context
    const { data: taxRules } = await supabase
      .from('tax_rules')
      .select('tax_type, version, rules_json, legal_reference')
      .eq('published', true)
      .eq('archived', false);

    // Build context from tax rules
    const rulesContext = taxRules?.map(r => ({
      type: r.tax_type,
      version: r.version,
      rules: r.rules_json,
      reference: r.legal_reference
    })) || [];

    // Build classification rules context
    const classificationContext = classificationRules?.map(r => ({
      category: r.category_key,
      label: r.category_label,
      default_value: r.default_value,
      legal_reference: r.legal_reference,
      reasoning: r.reasoning,
      examples: r.examples
    })) || [];

    // Check for direct category match first
    const directMatch = classificationRules?.find(r => 
      r.category_key === category.toLowerCase() || 
      r.category_key === category.toLowerCase().replace(/\s+/g, '_')
    );

    if (directMatch) {
      // Return direct match without AI for known categories
      return new Response(
        JSON.stringify({
          [type === 'expense' ? 'deductible' : 'tax_exempt']: directMatch.default_value,
          confidence: 'high',
          reasoning: directMatch.reasoning || `Category "${directMatch.category_label}" is configured as ${directMatch.default_value ? (type === 'expense' ? 'tax deductible' : 'tax exempt') : (type === 'expense' ? 'non-deductible' : 'taxable')}.`,
          legal_reference: directMatch.legal_reference || undefined
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      // Fallback to rule-based classification if AI not available
      return new Response(
        JSON.stringify(getFallbackClassification(type, category, classificationRules || [])),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a Nigerian tax classification AI. Your job is to analyze expenses and incomes and determine their tax treatment based on Nigerian tax law and the provided tax rules.

CONFIGURED CLASSIFICATION RULES:
${JSON.stringify(classificationContext, null, 2)}

NIGERIAN TAX RULES CONTEXT:
${JSON.stringify(rulesContext, null, 2)}

DEDUCTIBLE EXPENSES (for PIT/CIT):
Under Nigerian tax law (PITA Section 24, CITA Section 24), deductible expenses must be:
- Wholly, exclusively, and necessarily incurred for business purposes
- Not capital in nature (unless qualifying capital allowance)
- Properly documented with receipts/invoices

TYPICALLY DEDUCTIBLE:
- Office rent, utilities (electricity, internet, water)
- Staff salaries and wages
- Professional fees (legal, accounting, audit)
- Marketing and advertising costs
- Transport and logistics for business
- Cost of goods sold
- Business insurance
- Equipment maintenance
- Software subscriptions for business

NON-DEDUCTIBLE:
- Personal expenses (groceries, personal entertainment)
- Fines and penalties
- Donations to non-approved organizations
- Capital expenditure (unless qualifying for capital allowance)
- Provisions for bad debts (unless specifically written off)

TAX-EXEMPT INCOME:
Under Nigerian tax law, certain incomes are exempt:
- Gifts (unless from employer or in course of business)
- Personal loans received
- Grants for specific approved purposes
- Refunds of previously paid amounts
- Compensation for personal injury

TAXABLE INCOME:
- Employment income (salaries, wages, bonuses)
- Business/trade income
- Professional fees/consulting income
- Rental income
- Investment returns (dividends, interest)

You MUST respond with valid JSON only, no markdown or explanation outside the JSON:
{
  "${type === 'expense' ? 'deductible' : 'tax_exempt'}": boolean,
  "confidence": "high" | "medium" | "low",
  "reasoning": "Brief explanation (max 50 words)",
  "legal_reference": "Relevant section if applicable (e.g., 'PITA Section 24')"
}`;

    const userPrompt = `Classify this ${type}:
Category: ${category}
Description: ${description}
${amount_kobo ? `Amount: ₦${(parseInt(amount_kobo) / 100).toLocaleString()}` : ''}

Is this ${type === 'expense' ? 'tax deductible' : 'tax exempt'}?`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1, // Low temperature for consistent classification
      }),
    });

    if (!response.ok) {
      console.error('AI Gateway error:', response.status);
      return new Response(
        JSON.stringify(getFallbackClassification(type, category, classificationRules || [])),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse the JSON response
    try {
      // Remove any markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const classification = JSON.parse(jsonStr) as ClassifyResponse;
      
      return new Response(
        JSON.stringify(classification),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify(getFallbackClassification(type, category, classificationRules || [])),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Classification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface ClassificationRule {
  category_key: string;
  category_label: string;
  default_value: boolean;
  legal_reference: string | null;
  reasoning: string | null;
}

// Fallback rule-based classification using DB rules
function getFallbackClassification(
  type: 'expense' | 'income', 
  category: string,
  rules: ClassificationRule[]
): ClassifyResponse {
  // Try to find a matching rule from DB
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');
  const matchingRule = rules.find(r => 
    r.category_key === normalizedCategory || 
    r.category_key === category.toLowerCase() ||
    r.category_label.toLowerCase().includes(category.toLowerCase())
  );

  if (matchingRule) {
    if (type === 'expense') {
      return {
        deductible: matchingRule.default_value,
        confidence: 'high',
        reasoning: matchingRule.reasoning || 
          (matchingRule.default_value 
            ? 'Business expense typically qualifies as tax deductible.'
            : 'This expense is typically not tax deductible.'),
        legal_reference: matchingRule.legal_reference || 'PITA Section 24 / CITA Section 24'
      };
    } else {
      return {
        tax_exempt: matchingRule.default_value,
        confidence: 'high',
        reasoning: matchingRule.reasoning ||
          (matchingRule.default_value
            ? 'This income type is generally exempt from tax.'
            : 'This income is subject to Personal Income Tax.'),
        legal_reference: matchingRule.legal_reference || 'PITA Section 3'
      };
    }
  }

  // Hardcoded fallback if no DB rule found
  if (type === 'expense') {
    const deductibleCategories = [
      'rent', 'salaries', 'utilities', 'power', 'marketing', 'transport',
      'cogs', 'professional', 'office', 'equipment', 'insurance',
      'maintenance', 'software', 'training'
    ];
    const isDeductible = deductibleCategories.some(c => normalizedCategory.includes(c));
    
    return {
      deductible: isDeductible,
      confidence: 'low',
      reasoning: isDeductible 
        ? 'Business expense typically qualifies as tax deductible under PITA/CITA Section 24.'
        : 'Personal or non-business expense - typically not deductible.',
      legal_reference: 'PITA Section 24 / CITA Section 24'
    };
  } else {
    const exemptCategories = ['loan', 'gift', 'grant', 'refund'];
    const isExempt = exemptCategories.some(c => normalizedCategory.includes(c));
    
    return {
      tax_exempt: isExempt,
      confidence: 'low',
      reasoning: isExempt
        ? 'This income type is generally exempt from tax under Nigerian law.'
        : 'This income is subject to Personal Income Tax under PITA.',
      legal_reference: 'PITA Section 3'
    };
  }
}
