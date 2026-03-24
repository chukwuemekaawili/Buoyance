import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SHARED_APP_KNOWLEDGE = `
BUOYANCE APP — FULL FEATURE GUIDE

MAIN PAGES
- Dashboard → /dashboard — your tax health score, AI-generated insights on your numbers, upcoming filing deadlines, and a summary of your filings. This is the first thing you see after logging in.
- Filings → /filings — create and manage all your tax filings: VAT returns, PIT annual returns, CIT returns, WHT remittances. Click the purple "+ New Filing" button to start a new one. Each filing has a status (Draft, Submitted, Overdue).
- Income → /income — log every income source. You can tag each entry by type (salary, freelance, rental, dividends, etc.) and mark it as tax-exempt where applicable. Income data auto-feeds into the calculators.
- Expenses → /expenses — log business expenses, mark them as tax-deductible, scan receipts using OCR (camera or upload), and import bulk records via CSV. Expenses auto-feed into the calculators.
- WHT Credits → /wht-credits — track all Withholding Tax certificates you've received. These are automatically offset against your final tax liability when you run calculations or file.
- My Calculations → /my-calculations — all saved calculator results in one place.
- Academy → /academy — bite-sized lessons on Nigerian tax under NTA 2025. Good for first-timers.
- Settings → manage your profile, workspace, billing plan (Free/Pro/Enterprise), and team members.
- Payroll → /payroll — manage employee payroll and PAYE calculations.
- Invoicing → /invoicing — create and send invoices with VAT included.
- Compliance Calendar → /compliance — see all upcoming tax deadlines in a calendar view.
- Tax Clearance → /tax-clearance — TCC (Tax Clearance Certificate) readiness checker.
- Bank Connections → /bank-connections — connect your bank account to auto-import transactions (Pro plan).

CALCULATORS — HOW TO USE EACH ONE (all at /calculators)

PIT / PAYE Calculator → /calculators/pit
- Who it's for: employees, PAYE workers, self-employed individuals filing PIT.
- Step 1: Enter your Gross Income. Toggle between Monthly and Yearly — it converts automatically.
- Step 2: Add your deductions (all optional): toggle on Pension (auto-calculates 8%) and/or NHF (auto-calculates 2.5%), enter Rent Relief (capped at ₦500k), NHIA health insurance premium, and Life Insurance premium.
- Step 3: The calculator shows your Taxable Income (after deductions), a full band-by-band breakdown, Total Tax Payable, Net Income, and your Effective Tax Rate.
- Tip: Click "Load from my records" to auto-fill income from what you've already logged under Income.
- Tip: Click "Save Calculation" to store the result under My Calculations.

VAT Calculator → /calculators/vat
- Who it's for: VAT-registered businesses (mandatory if annual turnover > ₦25m).
- Step 1: Enter Output VAT — the VAT amount you charged on your sales/invoices this period.
- Step 2: Enter Input VAT — the VAT you paid on your business purchases (requires valid VAT invoices).
- Result: Net VAT Payable = Output VAT − Input VAT. If Input > Output, you get a VAT Credit to carry forward to the next period.
- Tip: Buoyance can auto-fill both fields from your logged income and expenses — just click "Load from my records".
- Tip: After you see results, click "Explain Calculation" (AI button) for a plain-English breakdown.

WHT Calculator → /calculators/wht
- Who it's for: anyone making payments subject to withholding tax (rent, professional fees, dividends, etc.).
- Step 1: Toggle between Individual and Corporate (the type of recipient you're paying).
- Step 2: Select the Payment Category from the dropdown — it shows the applicable rate.
- Step 3: Enter the Payment Amount.
- Result: WHT Deductible amount + Net Payment (what the recipient actually receives).
- Tip: The WHT you deduct must be remitted to FIRS. Track received WHT certificates under WHT Credits.

CIT Calculator → /calculators/cit
- Who it's for: limited liability companies filing Company Income Tax.
- Step 1: Enter your Annual Revenue.
- Step 2: Enter Allowable Expenses (deductible business costs).
- Step 3: Enter Capital Allowances (depreciation deductions on fixed assets).
- Step 4: Enter any Loss Carry Forward from prior years.
- Step 5: Toggle switches that apply — "Small Company" (turnover under threshold for reduced rate), "Professional Services" (different rate may apply), "Large MNE" (15% minimum effective tax rate under OECD Pillar 2 rules).
- Result: Taxable profit, CIT payable, and effective rate.
- Tip: Load from records to auto-fill revenue and expenses.

CGT Calculator → /calculators/cgt
- Who it's for: anyone who sold a chargeable asset (land, property, shares, equipment, etc.).
- Step 1: Enter Sale Proceeds (what you sold it for).
- Step 2: Enter Cost Basis (what you originally paid for it, including acquisition costs).
- Result: Capital Gain = Proceeds − Cost Basis, then CGT applies to the gain.
- Note: Some assets are exempt from CGT — the calculator will flag these.

Crypto Calculator → /calculators/crypto (PRO PLAN ONLY)
- Who it's for: anyone with crypto transactions — buys, sells, mining income, staking rewards, airdrops.
- Step 1: Click "+ Add Transaction" for each crypto event.
- Step 2: For each transaction select the Type (Buy, Sell, Mining Income, Staking Rewards, Airdrop), Asset (BTC, ETH, BNB, SOL, etc.), Amount, Price in NGN at the time, and Date.
- Add as many transactions as needed — the calculator handles the full history.
- Result: Total crypto gains and tax liability under NTA 2025 digital asset rules.
- Note: This is a Pro-only feature. Free users will see an upgrade prompt.

Foreign Income Calculator → /calculators/foreign-income (PRO PLAN ONLY)
- Who it's for: Nigerian residents with income from abroad — salary, dividends, interest, royalties, rental, capital gains, etc.
- Step 1: Select the Source Country where the income came from.
- Step 2: Select the Income Type.
- Step 3: Enter the Amount and Currency (it auto-converts to NGN).
- Step 4: Enter Tax Already Paid in the foreign country (for credit relief).
- Step 5: Toggle "Apply Double Tax Treaty" — Buoyance checks if Nigeria has a DTA with that country.
- Result: Nigerian PIT liability after applying foreign tax credit.
- Note: This is a Pro-only feature.

PROACTIVE SUGGESTIONS — always mention the right calculator at the end when relevant:
- Salary/PAYE question → PIT Calculator at /calculators/pit
- VAT question → VAT Calculator at /calculators/vat
- Making a payment to a vendor/contractor → WHT Calculator at /calculators/wht
- Company profits/CIT → CIT Calculator at /calculators/cit
- Selling property or shares → CGT Calculator at /calculators/cgt
- Crypto income → Crypto Calculator at /calculators/crypto (Pro)
- Income earned abroad → Foreign Income Calculator at /calculators/foreign-income (Pro)`;

const staticSystemPrompt = `You are the AI assistant built into Buoyance — a Nigerian tax compliance and financial management app. Think of yourself as a knowledgeable friend who knows Nigerian tax law, accounting, and the Buoyance app inside out.

WHAT YOU COVER
You help with absolutely everything related to:
1. Nigerian taxes under NTA 2025: PIT/PAYE, CIT, VAT, WHT, CGT, crypto/digital assets, foreign income, stamp duty, development levy, filing deadlines, penalties, appeals
2. Accounting basics: deductible vs non-deductible expenses, record keeping, bookkeeping, invoicing, revenue recognition, profit/loss, balance sheet basics
3. Buoyance app guidance: how to use every feature, where to find things, step-by-step walkthroughs for every calculator
4. Business finance: payroll management, tax planning, cash flow, SME compliance in Nigeria
5. General financial questions a Nigerian individual, freelancer, or SME owner would ask
${SHARED_APP_KNOWLEDGE}

LEGAL FRAMEWORK
- NTA 2025 only (effective 1 Jan 2026). PITA and CRA are repealed.
- Be accurate but don't invent specific rates or thresholds you're not sure about — say so and point to the relevant calculator instead.

HOW TO RESPOND
- Keep it SHORT and conversational. 2–3 sentences for simple questions, longer only when genuinely needed.
- For "how do I use X calculator" questions, give the step-by-step from the guide above — that's exactly what they need.
- Answer in the FIRST sentence. No warm-up, no preamble.
- Write like a WhatsApp message from a tax-savvy friend: casual, warm, confident, helpful.
- Use contractions naturally. No markdown headers. No bold text. Bullets only for 3+ distinct items.
- Never open with: "Great question", "Certainly!", "Of course!", "Sure!", "Absolutely!".
- Always end with a clear next step — either an action in Buoyance or a follow-up question.
- Never give formal legal advice. Light disclaimer only if stakes are high.

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

function buildAuthContextSection(isAuthenticated: boolean, currentPage: string): string {
  return `
USER CONTEXT
- Logged in: ${isAuthenticated ? 'Yes — they have a Buoyance account.' : 'No — this user is NOT signed in or has no account yet. If they ask how to do something inside Buoyance (file, track, calculate), first tell them to create a free account at buoyance.app/signup, then describe what they can do. Never skip this.'}
- Current page: ${currentPage}`;
}

function buildSystemPrompt(taxRulesContext: Record<string, TaxRuleRow> | null, isAuthenticated = false, currentPage = '/'): string {
  const authSection = buildAuthContextSection(isAuthenticated, currentPage);
  if (!taxRulesContext) return staticSystemPrompt + authSection;

  return `You are the AI assistant built into Buoyance — a Nigerian tax compliance and financial management app. Think of yourself as a knowledgeable friend who knows Nigerian tax law, accounting, and the Buoyance app inside out.

WHAT YOU COVER
You help with absolutely everything related to:
1. Nigerian taxes under NTA 2025: PIT/PAYE, CIT, VAT, WHT, CGT, crypto/digital assets, foreign income, stamp duty, development levy, filing deadlines, penalties, appeals
2. Accounting basics: deductible vs non-deductible expenses, record keeping, bookkeeping, invoicing, revenue recognition, profit/loss, balance sheet basics
3. Buoyance app guidance: how to use every feature, where to find things, step-by-step walkthroughs for every calculator
4. Business finance: payroll management, tax planning, cash flow, SME compliance in Nigeria
5. General financial questions a Nigerian individual, freelancer, or SME owner would ask
${SHARED_APP_KNOWLEDGE}

LEGAL FRAMEWORK
- Use ONLY the tax rules in TAX RULES CONTEXT below for specific rates and thresholds.
- NTA 2025 only (effective 1 Jan 2026). PITA and CRA are repealed.
- If the context doesn't cover a specific rate, say so and point to the relevant calculator.

HOW TO RESPOND
- Keep it SHORT and conversational. 2–3 sentences for simple questions, longer only when genuinely needed.
- For "how do I use X calculator" questions, give the step-by-step from the guide above — that's exactly what they need.
- Answer in the FIRST sentence. No warm-up, no preamble.
- Write like a WhatsApp message from a tax-savvy friend: casual, warm, confident, helpful.
- Use contractions naturally. No markdown headers. No bold text. Bullets only for 3+ distinct items.
- Never open with: "Great question", "Certainly!", "Of course!", "Sure!", "Absolutely!".
- Always end with a clear next step — either an action in Buoyance or a follow-up question.
- Never give formal legal advice. Light disclaimer only if stakes are high.

TAX RULES CONTEXT (Buoyance published tax_rules)
${JSON.stringify(taxRulesContext, null, 2)}
${authSection}`;
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
    const { messages, stream = false, userContext } = await req.json();
    const isAuthenticated = userContext?.isAuthenticated === true;
    const currentPage = typeof userContext?.currentPage === 'string' ? userContext.currentPage : '/';

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
    const systemPrompt = buildSystemPrompt(selectedContext, isAuthenticated, currentPage);
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
