import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const staticSystemPrompt = `You are a Nigerian tax expert inside Buoyance — think of yourself as a sharp, friendly colleague the user can text for a quick tax answer.

LEGAL FRAMEWORK
- NTA 2025 only (effective 1 Jan 2026). PITA and CRA are repealed — don't use them.

HOW TO RESPOND
- Keep it SHORT. 2–3 sentences for simple questions. Only go longer if truly needed.
- Answer in the FIRST sentence. No warm-up, no preamble.
- Write like a WhatsApp message from a tax-savvy friend: casual, warm, confident.
- Use contractions: "you'll", "it's", "don't", "here's", "that's".
- No markdown headers. No bold text. Bullets only when listing 3+ distinct items.
- Never open with: "Great question", "Certainly!", "Of course!", "Sure!", "Absolutely!".
- End with ONE casual next-step sentence — what should the user do or check.
- If you're not sure, say so in one sentence and ask ONE short follow-up question.
- Never provide legal advice. Keep a light disclaimer only if the stakes are high.

TAX RULES CONTEXT
(Unavailable - the rules database is not configured for this environment.)`;

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

  return `You are a Nigerian tax expert inside Buoyance — think of yourself as a sharp, friendly colleague the user can text for a quick tax answer.

LEGAL FRAMEWORK
- NTA 2025 only (effective 1 Jan 2026). PITA and CRA are repealed — don't reference them unless the user asks directly.
- Use ONLY the tax rules in TAX RULES CONTEXT below. Don't invent rates, thresholds, or exemptions not found there.
- If the context doesn't cover something, say so in one sentence and ask ONE clarifying question.

HOW TO RESPOND
- Keep it SHORT. 2–3 sentences for simple questions. Only go longer if truly needed.
- Answer in the FIRST sentence. No warm-up, no preamble.
- Write like a WhatsApp message from a tax-savvy friend: casual, warm, confident.
- Use contractions: "you'll", "it's", "don't", "here's", "that's".
- No markdown headers. No bold text. Bullets only when listing 3+ distinct items.
- Never open with: "Great question", "Certainly!", "Of course!", "Sure!", "Absolutely!".
- End with ONE casual next-step sentence — what should the user do or check.
- Never provide legal advice. Add a light disclaimer only if the stakes are high.

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

  // Pricing/subscription questions (static product knowledge, not tax-law dependent)
  if (
    q.includes('pricing') ||
    q.includes('price') ||
    q.includes('cost') ||
    q.includes('subscription') ||
    q.includes('plan') ||
    q.includes('free') ||
    q.includes('paid')
  ) {
    return [
      "Sure — Buoyance has a Free plan plus paid Pro and Enterprise options.",
      "",
      "Free plan (monthly limits):",
      "- AI explanations: 3",
      "- Receipt OCR scans: 5",
      "- API requests: 100",
      "- Bank syncs: not included",
      "",
      "Pro plan (monthly limits):",
      "- AI explanations: 100",
      "- Receipt OCR scans: 500",
      "- API requests: 5,000",
      "- Bank syncs: 10",
      "",
      "For current amounts, head to the Pricing page: /pricing",
    ].join("\n");
  }

  // Buoyance product/app questions: respond with curated, non-sensitive product overview.
  if (q.includes('buoyance') || q.includes('this app') || q.includes('your app')) {
    return [
      "Buoyance is a Nigerian tax compliance app — think of it as your NTA 2025 co-pilot.",
      "",
      "Here's what you can do:",
      "- Track income and expenses (receipt scanning and CSV import included).",
      "- Run tax calculators for PIT/PAYE, CIT, VAT, WHT, CGT, crypto, and foreign income.",
      "- Prepare filings and export filing packs (PDF/Excel where available).",
      "- Manage workspaces, usage quotas, and compliance reminders.",
      "",
      "Tell me what you're trying to accomplish and I'll point you to the right spot.",
    ].join("\n");
  }

  // CRA / legacy prompt guardrail (fast, deterministic)
  if (q.includes('consolidated relief allowance') || /\bcra\b/.test(q)) {
    return [
      "Right — the CRA (Consolidated Relief Allowance) was abolished when NTA 2025 kicked in on 1 January 2026.",
      "",
      "In Buoyance, I can only apply reliefs and deductions that are explicitly allowed in the published rules for the relevant tax type.",
      "",
      "Are you working out PAYE for an employee, or PIT for someone who's self-employed?",
    ].join("\n");
  }

  // Allowances/benefits: avoid hallucinating treatment not covered by structured rules
  if (
    (q.includes('allowance') || q.includes('benefit')) &&
    (q.includes('taxable') || q.includes('exempt') || q.includes('tax'))
  ) {
    return [
      "That specific allowance or benefit isn't explicitly covered in the rules I have access to — so I can't confirm its treatment safely.",
      "",
      "If you can tell me two things, I'll help you work it out:",
      "- Is this a cash allowance through payroll (PAYE), or a reimbursed expense?",
      "- Is it for an employee (PIT/PAYE) or a company (CIT)?",
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
          `Here's what Buoyance currently treats as VAT-exempt (rule ${vatRule.version}, effective ${vatRule.effective_date}):`,
          "",
          ...lines,
          "",
          rateLine,
          "",
          "What's the specific item or service on your invoice? I can tell you whether it fits.",
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
        const maxLines = 12;
        const shown = lines.slice(0, maxLines);
        const hiddenCount = Math.max(0, lines.length - shown.length);

        return [
          `Here are the current WHT rates in Buoyance (rule ${whtRule.version}, effective ${whtRule.effective_date}):`,
          "",
          ...shown,
          ...(hiddenCount > 0 ? ["", `...and ${hiddenCount} more. Tell me if you want the full list.`] : []),
          "",
          "Share the transaction type and whether the recipient is a company or an individual — I'll confirm the exact rate.",
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
          `These are the PIT/PAYE bands Buoyance is using (rule ${pitRule.version}, effective ${pitRule.effective_date}):`,
          "",
          ...lines,
          "",
          "If you share the annual taxable income (or monthly salary), I can estimate the PIT payable.",
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
          `Here's the CIT picture for small companies in Buoyance (rule ${citRule.version}, effective ${citRule.effective_date}):`,
          "",
          ...lines,
          "",
          "Share your annual turnover and total assets and I'll confirm whether the small-company rate applies to you.",
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
    const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-3-haiku-20240307';
    const maxTokensEnv = Number(Deno.env.get('ANTHROPIC_MAX_TOKENS') || '600');
    const maxTokens = Number.isFinite(maxTokensEnv) ? Math.max(64, Math.min(4096, maxTokensEnv)) : 600;
    const temperatureEnv = Number(Deno.env.get('ANTHROPIC_TEMPERATURE') || '0.4');
    const temperature = Number.isFinite(temperatureEnv) ? Math.max(0, Math.min(1, temperatureEnv)) : 0.4;

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
    const content = data.content?.[0]?.text || "Sorry - I couldn't generate a response.";

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
