import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const staticSystemPrompt = `You are the Intelligent Tax Assistant for Buoyance.

CRITICAL LEGAL FRAMEWORK
- You operate exclusively under the Nigeria Tax Act 2025 (NTA 2025), effective 1 January 2026.
- REPEALED: The Personal Income Tax Act (PITA) and the "Consolidated Relief Allowance" (CRA) are no longer valid. Do not use them.

BEHAVIOR (STRICT)
- Use ONLY the tax rules provided in TAX RULES CONTEXT. If the context does not support an answer, say so and ask a clarifying question.
- Do NOT invent lists (exemptions, thresholds, rates) or legal references.
- Keep answers concise and practical.
- Do not provide legal advice.

TAX RULES CONTEXT
(Unavailable — the rules database is not configured for this environment.)`;

interface TaxRuleRow {
  tax_type: string;
  version: string;
  effective_date: string;
  law_reference_json: unknown | null;
  legal_reference: string | null;
  nta_section: string | null;
  rules_json: unknown;
}

const TAX_RULES_CACHE_TTL_MS = 5 * 60 * 1000;
let taxRulesCache: { fetchedAt: number; context: Record<string, TaxRuleRow> } | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatPercent(rate: number): string {
  const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
  return `${fmt.format(rate * 100)}%`;
}

function formatNairaFromKobo(kobo: number): string {
  const naira = kobo / 100;
  const fmt = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 });
  return `₦${fmt.format(naira)}`;
}

function buildSystemPrompt(taxRulesContext: Record<string, TaxRuleRow> | null): string {
  if (!taxRulesContext) return staticSystemPrompt;

  return `You are the Intelligent Tax Assistant for Buoyance.

CRITICAL LEGAL FRAMEWORK
- You operate exclusively under the Nigeria Tax Act 2025 (NTA 2025), effective 1 January 2026.
- REPEALED: The Personal Income Tax Act (PITA) and the "Consolidated Relief Allowance" (CRA) are no longer valid. Do not use them.

BEHAVIOR (STRICT)
- Use ONLY the tax rules provided in TAX RULES CONTEXT below.
- If the context does not support an answer, say you do not have enough information and ask a clarifying question.
- Do NOT invent lists (exemptions, thresholds, rates) or legal references.
- Keep answers concise and practical.
- Do not provide legal advice.

TAX RULES CONTEXT (Buoyance published tax_rules)
${JSON.stringify(taxRulesContext, null, 2)}`;
}

function selectContextForQuestion(
  question: string,
  ctx: Record<string, TaxRuleRow> | null
): Record<string, TaxRuleRow> | null {
  if (!ctx) return null;

  const q = question.toLowerCase();
  const wanted = new Set<string>();

  if (q.includes('vat')) wanted.add('VAT');
  if (q.includes('wht') || q.includes('withholding')) wanted.add('WHT');
  if (q.includes('cit') || q.includes('company income tax')) wanted.add('CIT');
  if (q.includes('pit') || q.includes('paye') || q.includes('personal income')) wanted.add('PIT');
  if (q.includes('cgt') || q.includes('capital gains')) wanted.add('CGT');
  if (q.includes('crypto') || q.includes('digital asset')) wanted.add('CGT'); // digital assets sit under CGT in our rules

  if (wanted.size === 0) return ctx;

  const subset: Record<string, TaxRuleRow> = {};
  for (const key of wanted) {
    if (ctx[key]) subset[key] = ctx[key];
  }

  return Object.keys(subset).length > 0 ? subset : ctx;
}

async function getTaxRulesContext(): Promise<Record<string, TaxRuleRow> | null> {
  const now = Date.now();
  if (taxRulesCache && now - taxRulesCache.fetchedAt < TAX_RULES_CACHE_TTL_MS) {
    return taxRulesCache.context;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey =
    Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from('tax_rules')
    .select('tax_type, version, effective_date, law_reference_json, legal_reference, nta_section, rules_json')
    .eq('published', true)
    .eq('archived', false)
    .order('effective_date', { ascending: false });

  if (error) {
    console.error('Failed to load tax_rules context:', error);
    return null;
  }

  const latestByType: Record<string, TaxRuleRow> = {};
  for (const row of (data as unknown as TaxRuleRow[]) || []) {
    if (!row?.tax_type) continue;
    if (!latestByType[row.tax_type]) {
      latestByType[row.tax_type] = row;
    }
  }

  taxRulesCache = { fetchedAt: now, context: latestByType };
  return latestByType;
}

function buildFastReply(question: string, ctx: Record<string, TaxRuleRow> | null): string | null {
  const q = question.toLowerCase();

  // CRA / legacy prompt guardrail (fast, deterministic)
  if (q.includes('consolidated relief allowance') || /\bcra\b/.test(q)) {
    return [
      "Under the Nigeria Tax Act 2025 (effective 1 January 2026), Consolidated Relief Allowance (CRA) is repealed.",
      "",
      "You can only apply specific statutory reliefs that are explicitly allowed (e.g., pension, NHF), plus any new reliefs defined under NTA 2025 (e.g., Rent Relief where applicable).",
      "",
      "If you tell me the taxpayer type (employee/self-employed) and the relief you’re considering, I’ll walk through how it applies under NTA 2025.",
    ].join("\n");
  }

  // VAT exemptions: respond from published VAT rule (no hallucinations)
  if (q.includes('vat') && q.includes('exempt')) {
    const vatRule = ctx?.VAT;
    const rulesJson = vatRule ? vatRule.rules_json : null;

    if (vatRule && isRecord(rulesJson)) {
      const exempt = rulesJson.exempt_categories;
      const vatRate = rulesJson.vat_rate;

      if (Array.isArray(exempt) && exempt.every((x) => typeof x === 'string')) {
        const lines = exempt.map((c) => `- ${c}`);
        const rateLine =
          typeof vatRate === 'number' && Number.isFinite(vatRate)
            ? `VAT rate: ${formatPercent(vatRate)}.`
            : null;

        return [
          `VAT-exempt categories (from Buoyance published VAT rule ${vatRule.version}, effective ${vatRule.effective_date}):`,
          "",
          ...lines,
          "",
          rateLine,
          "",
          "If you tell me the exact item/service, I can help confirm whether it falls under one of these categories.",
        ]
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .join("\n");
      }
    }
  }

  // WHT rates summary: respond from published WHT rule
  if ((q.includes('wht') || q.includes('withholding')) && (q.includes('rate') || q.includes('rates'))) {
    const whtRule = ctx?.WHT;
    const rulesJson = whtRule ? whtRule.rules_json : null;

    if (whtRule && isRecord(rulesJson) && Array.isArray(rulesJson.categories)) {
      const cats = rulesJson.categories;
      const lines: string[] = [];

      for (const c of cats) {
        if (!isRecord(c)) continue;
        const name = c.name;
        const corporate = c.corporate_rate;
        const individual = c.individual_rate;
        if (typeof name !== 'string') continue;
        if (typeof corporate !== 'number' || typeof individual !== 'number') continue;

        const display =
          corporate === individual
            ? `${formatPercent(corporate)}`
            : `Corporate: ${formatPercent(corporate)} | Individual: ${formatPercent(individual)}`;
        lines.push(`- ${name}: ${display}`);
      }

      if (lines.length > 0) {
        return [
          `Withholding Tax (WHT) rates (from Buoyance published WHT rule ${whtRule.version}, effective ${whtRule.effective_date}):`,
          "",
          ...lines,
          "",
          "Tell me the transaction type and whether the recipient is corporate or individual, and I’ll confirm the applicable rate.",
        ].join("\n");
      }
    }
  }

  // PIT bands summary: respond from published PIT rule
  if ((q.includes('pit') || q.includes('paye')) && (q.includes('band') || q.includes('bands') || q.includes('rate') || q.includes('rates'))) {
    const pitRule = ctx?.PIT;
    const rulesJson = pitRule ? pitRule.rules_json : null;

    if (pitRule && isRecord(rulesJson) && Array.isArray(rulesJson.bands)) {
      const bands = rulesJson.bands;
      const lines: string[] = [];

      for (const b of bands) {
        if (!isRecord(b)) continue;
        const label = b.label;
        const rate = b.rate;
        if (typeof label !== 'string') continue;
        if (typeof rate !== 'number') continue;
        lines.push(`- ${label}: ${formatPercent(rate)}`);
      }

      if (lines.length > 0) {
        return [
          `Personal Income Tax (PIT/PAYE) bands (from Buoyance published PIT rule ${pitRule.version}, effective ${pitRule.effective_date}):`,
          "",
          ...lines,
          "",
          "If you share the annual taxable income and statutory deductions (e.g., pension, NHF, rent relief), I can estimate the PIT payable.",
        ].join("\n");
      }
    }
  }

  // CIT small company summary: respond from published CIT rule
  if ((q.includes('cit') || q.includes('company income tax')) && q.includes('small')) {
    const citRule = ctx?.CIT;
    const rulesJson = citRule ? citRule.rules_json : null;

    if (citRule && isRecord(rulesJson) && isRecord(rulesJson.rates)) {
      const rates = rulesJson.rates;
      const standard = rates.standard_rate;
      const smallRate = rates.small_company_rate;
      const threshold = rates.small_company_threshold_kobo;
      const assetThreshold = rates.small_company_asset_threshold_kobo;
      const devLevy = rates.development_levy_rate;

      const lines: string[] = [];
      if (typeof smallRate === 'number') lines.push(`- Small company CIT rate: ${formatPercent(smallRate)}`);
      if (typeof standard === 'number') lines.push(`- Standard CIT rate: ${formatPercent(standard)}`);
      if (typeof devLevy === 'number') lines.push(`- Development Levy: ${formatPercent(devLevy)} (where applicable)`);
      if (typeof threshold === 'number') lines.push(`- Small company turnover threshold: ${formatNairaFromKobo(threshold)} annual turnover`);
      if (typeof assetThreshold === 'number') lines.push(`- Small company asset threshold: ${formatNairaFromKobo(assetThreshold)} total assets`);

      if (lines.length > 0) {
        return [
          `Company Income Tax (CIT) — small company summary (from Buoyance published CIT rule ${citRule.version}, effective ${citRule.effective_date}):`,
          "",
          ...lines,
          "",
          "If you share turnover, total assets, and whether it’s a professional services company, I can confirm whether the small-company rate applies.",
        ].join("\n");
      }
    }
  }

  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages, stream = false } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((m: unknown) => isRecord(m) && m.role === 'user' && typeof m.content === 'string') as
      | { role: 'user'; content: string }
      | undefined;
    const question = lastUserMessage?.content?.trim() || '';

    const taxRulesContext = await getTaxRulesContext();
    const fastReply = question ? buildFastReply(question, taxRulesContext) : null;
    if (fastReply) {
      return new Response(
        JSON.stringify({ content: fastReply, model: 'buoyance-rules' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration Error: ANTHROPIC_API_KEY is missing in Supabase Secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const selectedContext = question ? selectContextForQuestion(question, taxRulesContext) : taxRulesContext;
    const systemPrompt = buildSystemPrompt(selectedContext);
    const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-sonnet-4-20250514';
    const maxTokensEnv = Number(Deno.env.get('ANTHROPIC_MAX_TOKENS') || '512');
    const maxTokens = Number.isFinite(maxTokensEnv) ? Math.max(64, Math.min(4096, maxTokensEnv)) : 512;
    const temperatureEnv = Number(Deno.env.get('ANTHROPIC_TEMPERATURE') || '0.2');
    const temperature = Number.isFinite(temperatureEnv) ? Math.max(0, Math.min(1, temperatureEnv)) : 0.2;

    // Convert OpenAI-style messages to Anthropic format
    // Anthropic separates system prompt from messages and uses a different role format
    const anthropicMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: anthropicMessages,
        max_tokens: maxTokens,
        temperature,
        ...(stream ? { stream: true } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Configuration Error: Invalid ANTHROPIC_API_KEY.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (stream) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const data = await response.json();
    // Anthropic returns content as an array of content blocks
    const content = data.content?.[0]?.text || 'I apologize, but I could not generate a response.';

    return new Response(
      JSON.stringify({
        content,
        model,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
