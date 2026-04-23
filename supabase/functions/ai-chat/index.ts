import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  consumeQuota,
  getAuthenticatedContext,
  releaseQuota,
} from "../_shared/workspace.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const CIT_REVIEW_REASON =
  "Buoyance's CIT calculator, library, and filing guidance are paused until company-tax assumptions receive expert review.";
const WHT_REVIEW_REASON =
  "Buoyance's WHT calculator, library, and filing guidance are paused until withholding-tax assumptions receive expert review.";

const SHARED_APP_KNOWLEDGE = `
BUOYANCE APP — FULL FEATURE GUIDE

FREE VS PRO PLAN (important — never tell free users they can access Pro-only features)
FREE plan includes: PIT, VAT, and CGT calculators, income & expense tracking, CSV import, filing preparation, PDF export, compliance calendar, academy, 3 AI explanations/month, 5 receipt OCR scans/month, 100 API requests/month. CIT and WHT calculator surfaces are paused while their live assumptions are reviewed.
PRO plan adds: Crypto calculator, Foreign Income calculator, payroll multi-employee calculator, WHT credit recovery, TCC readiness tracker, audit workspace, AI dashboard insights, invoice generator, bank feed connections (10 syncs/month), team members & multi-workspace, 100 AI explanations/month, 500 OCR scans/month, 5,000 API requests/month.
ENTERPRISE plan: unlimited everything.

MAIN PAGES (correct routes — use these exactly)
- Dashboard → /dashboard — tax health score, AI insights (Pro), filing overview, upcoming deadlines.
- Filings → /filings — create VAT returns and PIT returns. CIT and WHT filing creation is paused pending expert review. Click "+ New Filing" to start. Statuses: Draft, Submitted, Overdue.
- Income → /incomes — log income by type (salary, freelance, rental, dividends). Mark tax-exempt where applicable. Auto-feeds into calculators.
- Expenses → /expenses — log deductible expenses, scan receipts via OCR, import CSV. Auto-feeds into calculators.
- WHT Credits → /wht-credits — track WHT certificates received. Offsets your tax liability. (Pro only)
- My Calculations → /my-calculations — all saved calculator results.
- Academy → /academy — bite-sized NTA 2025 lessons. Free for all users.
- Payroll → /payroll — multi-employee payroll and PAYE. (Pro only)
- Invoicing → /invoicing — create VAT-inclusive invoices. (Pro only)
- Compliance Calendar → /compliance-calendar — all upcoming tax deadlines in calendar view. Free for all users.
- TCC Readiness → /tcc — Tax Clearance Certificate readiness tracker. (Pro only)
- Bank Connections → /bank-connections — connect bank account to auto-import transactions. (Pro only)
- Settings → /settings — profile, workspace, billing plan, team members.

CALCULATORS — HOW TO USE EACH ONE (all at /calculators)

PIT / PAYE Calculator → /calculators/pit (FREE)
- Who it's for: employees, PAYE workers, self-employed individuals filing PIT.
- Step 1: Enter your Gross Income. Toggle between Monthly and Yearly — it converts automatically.
- Step 2: Add deductions (all optional): toggle Pension (auto-calculates 8%) and/or NHF (auto-calculates 2.5%), enter Rent Relief (capped at ₦200k), NHIA premium, Life Insurance premium.
- Step 3: See Taxable Income, band-by-band breakdown, Total Tax Payable, Net Income, and Effective Tax Rate.
- Tip: "Load from my records" auto-fills income from your logged entries.
- Tip: "Save Calculation" stores the result under My Calculations.

VAT Calculator → /calculators/vat (FREE)
- Who it's for: VAT-registered businesses (mandatory if annual turnover > ₦25m).
- Step 1: Enter Output VAT — VAT you charged on sales/invoices this period.
- Step 2: Enter Input VAT — VAT you paid on business purchases (needs valid VAT invoices).
- Result: Net VAT Payable = Output VAT − Input VAT. If Input > Output, you get a VAT Credit to carry forward.
- Tip: "Load from my records" auto-fills from logged income and expenses.
- Tip: "Explain Calculation" button gives an AI plain-English breakdown.

WHT Calculator → /calculators/wht
- Status: paused for launch review.
- ${WHT_REVIEW_REASON}
- If a user asks for WHT help, explain the pause and direct them to manual review or Support instead of quoting an in-app rate.

CIT Calculator → /calculators/cit
- Status: paused for launch review.
- ${CIT_REVIEW_REASON}
- If a user asks for CIT help, explain the pause and direct them to manual review or Support instead of quoting an in-app rate.

CGT Calculator → /calculators/cgt (FREE)
- Who it's for: anyone who sold a chargeable asset (land, property, shares, equipment).
- Step 1: Enter Sale Proceeds (what you sold it for).
- Step 2: Enter Cost Basis (original purchase price including acquisition costs).
- Result: Capital Gain = Proceeds − Cost Basis, CGT applies to the gain.
- Note: Some assets are CGT-exempt — the calculator flags these.

Crypto Calculator → /calculators/crypto (PRO ONLY)
- Who it's for: anyone with crypto transactions — buys, sells, mining, staking rewards, airdrops.
- Click "+ Add Transaction" for each event. Select Type (Buy/Sell/Mining Income/Staking Rewards/Airdrop), Asset (BTC/ETH/BNB/SOL etc.), Amount, Price in NGN at the time, Date.
- Result: Total crypto gains and tax liability under NTA 2025 digital asset rules.
- Free users see an upgrade prompt when they try to access this.

Foreign Income Calculator → /calculators/foreign-income (PRO ONLY)
- Who it's for: Nigerian residents with income earned abroad.
- Step 1: Select Source Country.
- Step 2: Select Income Type (employment, dividends, interest, royalties, rental, capital gains, etc.).
- Step 3: Enter Amount + Currency (auto-converts to NGN).
- Step 4: Enter Tax Paid in the foreign country.
- Step 5: Toggle "Apply Double Tax Treaty" — checks if Nigeria has a DTA with that country.
- Result: Nigerian PIT liability after applying foreign tax credit.
- Free users see an upgrade prompt.

PROACTIVE SUGGESTIONS — always mention the right calculator at the end when relevant:
- Salary/PAYE question → PIT Calculator at /calculators/pit
- VAT question → VAT Calculator at /calculators/vat
- Payment to vendor/contractor → explain that WHT guidance is paused and suggest manual review plus WHT Credits if they already have certificates
- Company profits/CIT → explain that CIT guidance is paused and suggest manual review or Support
- Selling property or shares → CGT Calculator at /calculators/cgt
- Crypto income → Crypto Calculator at /calculators/crypto (Pro only)
- Income earned abroad → Foreign Income Calculator at /calculators/foreign-income (Pro only)`;

// Static prompt used when tax_rules DB is unavailable — auth section is appended at call time
const staticSystemPromptBase = `You are the AI assistant built into Buoyance — a Nigerian tax compliance and financial management app. Think of yourself as a knowledgeable friend who knows Nigerian tax law, accounting, and the Buoyance app inside out.

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
- For "how do I use X calculator" questions, give the step-by-step — numbered list is fine here.
- Answer in the FIRST sentence. No warm-up, no preamble.
- Write like a WhatsApp message from a tax-savvy friend: casual, warm, confident, helpful.
- Use contractions naturally. Use bullet points and bold text when it genuinely helps clarity (steps, lists of items). Avoid markdown headers (##).
- Never open with: "Great question", "Certainly!", "Of course!", "Sure!", "Absolutely!".
- Always end with a clear next step — either an action in Buoyance or a follow-up question.
- Never give formal legal advice. Light disclaimer only if stakes are high.`;

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
const MAX_CHAT_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 6000;
let taxRulesCache: { fetchedAt: number; context: Record<string, TaxRuleRow> } | null = null;

interface ChatMessageInput {
  role: string;
  content: string;
}

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

function sanitizePromptText(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:\+?234|0)?[7-9][01]\d{8}\b/g, '[REDACTED_PHONE]')
    .replace(
      /((?:TIN|T\.I\.N|Tax\s*ID|Tax\s*Identification\s*Number|BVN|NIN|Account\s*Number|Acct\.?\s*No\.?|Card\s*Number|PAN)\s*[:#-]?\s*)([A-Z0-9 -]{6,})/gi,
      '$1[REDACTED]'
    )
    .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_CARD]')
    .trim();
}

function toChatMessages(messages: unknown): ChatMessageInput[] {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(isRecord)
    .map((msg) => ({
      role: typeof msg.role === 'string' ? msg.role : 'user',
      content: typeof msg.content === 'string' ? msg.content : '',
    }))
    .filter((msg) => msg.content.trim().length > 0)
    .slice(-MAX_CHAT_MESSAGES)
    .map((msg) => ({
      ...msg,
      content: sanitizePromptText(msg.content).slice(0, MAX_MESSAGE_CHARS),
    }));
}

function buildAuthContextSection(isAuthenticated: boolean, currentPage: string): string {
  return `
USER CONTEXT
- Logged in: ${isAuthenticated ? 'Yes — they have a Buoyance account.' : 'No — this user is NOT signed in or has no account yet. If they ask how to do something inside Buoyance (file, track, calculate), first tell them to create a free account at buoyance.app/signup, then describe what they can do. Never skip this.'}
- Current page: ${currentPage}`;
}

function buildSystemPrompt(taxRulesContext: Record<string, TaxRuleRow> | null, isAuthenticated = false, currentPage = '/'): string {
  const authSection = buildAuthContextSection(isAuthenticated, currentPage);
  if (!taxRulesContext) {
    // Inject auth right after the identity line
    return staticSystemPromptBase.replace(
      'Think of yourself as a knowledgeable friend who knows Nigerian tax law, accounting, and the Buoyance app inside out.',
      `Think of yourself as a knowledgeable friend who knows Nigerian tax law, accounting, and the Buoyance app inside out.\n${authSection}`
    );
  }

  return `You are the AI assistant built into Buoyance — a Nigerian tax compliance and financial management app. Think of yourself as a knowledgeable friend who knows Nigerian tax law, accounting, and the Buoyance app inside out.
${authSection}

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
- For "how do I use X calculator" questions, give the step-by-step — numbered list is fine here.
- Answer in the FIRST sentence. No warm-up, no preamble.
- Write like a WhatsApp message from a tax-savvy friend: casual, warm, confident, helpful.
- Use contractions naturally. Use bullet points and bold text when it genuinely helps clarity (steps, lists of items). Avoid markdown headers (##).
- Never open with: "Great question", "Certainly!", "Of course!", "Sure!", "Absolutely!".
- Always end with a clear next step — either an action in Buoyance or a follow-up question.
- Never give formal legal advice. Light disclaimer only if stakes are high.

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

  if (q.includes('vat') || q.includes('invoice') || q.includes('value added')) wanted.add('VAT');
  if (q.includes('wht') || q.includes('withholding') || q.includes('deduct') && q.includes('payment')) wanted.add('WHT');
  if (q.includes('cit') || q.includes('company income tax') || q.includes('corporate tax') || q.includes('company tax')) wanted.add('CIT');
  if (q.includes('pit') || q.includes('paye') || q.includes('personal income') || q.includes('salary') || q.includes('income tax')) wanted.add('PIT');
  if (q.includes('cgt') || q.includes('capital gains') || q.includes('sold property') || q.includes('sold land') || q.includes('sold shares')) wanted.add('CGT');
  if (q.includes('crypto') || q.includes('digital asset') || q.includes('bitcoin') || q.includes('ethereum')) wanted.add('CGT');

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

function buildFastReply(question: string, ctx: Record<string, TaxRuleRow> | null, isAuthenticated = false, currentPage = '/'): string | null {
  const q = question.toLowerCase();

  if (
    q.includes('first tax return') ||
    (q.includes('file') && q.includes('tax return') && q.includes('first'))
  ) {
    const accountLine = isAuthenticated
      ? 'Start in /filings, click "+ New Filing", choose the tax type, then save your draft before exporting the filing pack.'
      : 'Create a free account at buoyance.app/signup first, then head to /filings to start your first return.';

    return [
      accountLine,
      "",
      "You'll usually do it in this order:",
      "1. Log your income and deductible expenses.",
      "2. Run the matching calculator to estimate the numbers.",
      "3. Create the filing in /filings and review the period carefully.",
      "4. Export the filing pack and verify everything before any real submission.",
    ].join("\n");
  }

  if (
    q.includes('deductible expense') ||
    q.includes('what expenses can i deduct') ||
    ((q.includes('deduct') || q.includes('deductible')) && q.includes('expense'))
  ) {
    return [
      "A cost is usually only deductible if it's wholly for earning that taxable income and you can support it with records.",
      "",
      "Good examples to review are:",
      "- Business rent for the work premises",
      "- Tools, software, and supplies used for the work",
      "- Professional services tied to the business activity",
      "",
      "Tell me the exact expense type and whether this is PIT, VAT, or company tax, and I'll point you to the safest next step in Buoyance.",
    ].join("\n");
  }

  if (
    q.includes('calculate vat') ||
    (q.includes('vat') && q.includes('invoice'))
  ) {
    return [
      "Use the VAT Calculator at /calculators/vat: enter the VAT you charged on sales as Output VAT, then subtract valid Input VAT from business purchases.",
      "",
      "If you're issuing an invoice, keep the VAT amount clearly separated from the base amount so your records stay clean.",
      "",
      "If you want, send me the sale amount and whether it's VAT-inclusive or exclusive and I'll show the setup.",
    ].join("\n");
  }

  if (q.includes('payroll') && (q.includes('tax') || q.includes('employee'))) {
    return [
      "Buoyance handles payroll tax from /payroll for Pro workspaces, and the tax side follows the PIT/PAYE rules for each employee's taxable pay.",
      "",
      "You'll add each employee, enter their pay and deductions, then review the PAYE output before saving payroll records.",
      "",
      "If you're setting this up for the first time, tell me whether you have one employee or a full team.",
    ].join("\n");
  }

  if (
    q.includes('what records should i keep') ||
    (q.includes('record') && q.includes('tax'))
  ) {
    return [
      "Keep the documents that prove income earned, expenses claimed, taxes withheld, and what period each item belongs to.",
      "",
      "The core set is:",
      "- Invoices and receipts",
      "- Bank statements or payment confirmations",
      "- Payroll records where relevant",
      "- WHT certificates and prior filing records",
      "",
      "In Buoyance, the cleanest setup is to log income in /incomes, expenses in /expenses, and keep filing drafts in /filings.",
    ].join("\n");
  }

  // Pricing/subscription questions — tight matching only, avoid false positives on tax questions
  if (
    q.includes('pricing') ||
    q.includes('buoyance plan') ||
    q.includes('subscription') ||
    q.includes('upgrade to pro') ||
    q.includes('pro plan') ||
    q.includes('free plan') ||
    q.includes('how much does buoyance') ||
    q.includes('buoyance cost') ||
    q.includes('buoyance price') ||
    q.includes('enterprise plan')
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
    const signupLine = isAuthenticated
      ? "You're already in — head to /dashboard to see your tax health score and get started."
      : "You're not signed in yet. Create your free account at buoyance.app/signup and you're up in minutes.";
    return [
      "Buoyance is a Nigerian tax compliance app — think of it as your NTA 2025 co-pilot.",
      "",
      "Here's what you can do:",
      "- Track income and expenses (receipt scanning and CSV import included).",
      "- Run live tax calculators for PIT/PAYE, VAT, CGT, crypto, and foreign income.",
      "- Track WHT certificates already received; CIT and WHT filing-ready guidance is paused pending review.",
      "- Prepare filings and export filing packs.",
      "- Stay on top of deadlines with the compliance calendar.",
      "",
      signupLine,
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

  if (q.includes('cit') || q.includes('company income tax') || q.includes('corporate tax') || q.includes('company tax')) {
    return [
      "Buoyance's CIT guidance is currently under review, so I can't safely give you a filing-ready company-tax rate or threshold from inside the app right now.",
      "",
      CIT_REVIEW_REASON,
      "",
      "If you tell me what decision you're trying to make, I can help you frame it for manual review or a qualified adviser.",
    ].join("\n");
  }

  if (q.includes('wht') || q.includes('withholding')) {
    return [
      "Buoyance's WHT guidance is currently under review, so I can't safely give you a filing-ready withholding rate or remittance answer from inside the app right now.",
      "",
      WHT_REVIEW_REASON,
      "",
      "If you tell me the payment type and what you need to confirm, I can help you prepare it for manual review or a qualified adviser.",
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

  let authContext: Awaited<ReturnType<typeof getAuthenticatedContext>> = null;
  let workspaceId: string | null = null;
  let quotaConsumed = false;

  try {
    const payload = await req.json();
    const userContext = isRecord(payload) && isRecord(payload.userContext) ? payload.userContext : {};
    const stream = isRecord(payload) && payload.stream === true;
    const messages = toChatMessages(isRecord(payload) ? payload.messages : []);
    workspaceId = isRecord(payload)
      ? typeof payload.workspaceId === 'string'
        ? payload.workspaceId
        : typeof payload.workspace_id === 'string'
          ? payload.workspace_id
          : null
      : null;
    const currentPage =
      typeof userContext.currentPage === 'string' && userContext.currentPage.trim().length > 0
        ? userContext.currentPage.slice(0, 200)
        : '/';
    authContext = await getAuthenticatedContext(req);
    const isAuthenticated = Boolean(authContext?.user);

    const refundQuota = async () => {
      if (!authContext || !workspaceId || !quotaConsumed) return;
      await releaseQuota(authContext.supabase, workspaceId, 'ai_explanations');
      quotaConsumed = false;
    };

    if (messages.length === 0) {
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
    const fastReply = question ? buildFastReply(question, taxRulesContext, isAuthenticated, currentPage) : null;
    if (fastReply) {
      return new Response(
        JSON.stringify({ content: fastReply, model: 'buoyance-rules' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: 'Sign in to continue with AI explanations.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: 'workspaceId is required for AI explanations.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const quota = await consumeQuota(authContext.supabase, workspaceId, 'ai_explanations');
    if (!quota.allowed) {
      return new Response(
        JSON.stringify({ error: 'AI explanation quota exceeded for this workspace.', remaining: quota.remaining, limit: quota.limit }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    quotaConsumed = true;

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not configured');
      await refundQuota();
      return new Response(
        JSON.stringify({ error: 'Configuration Error: ANTHROPIC_API_KEY is missing in Supabase Secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const selectedContext = question ? selectContextForQuestion(question, taxRulesContext) : taxRulesContext;
    const systemPrompt = buildSystemPrompt(selectedContext, isAuthenticated, currentPage);
    const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-3-haiku-20240307';
    const maxTokensEnv = Number(Deno.env.get('ANTHROPIC_MAX_TOKENS') || '900');
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
      await refundQuota();

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
    if (authContext && workspaceId && quotaConsumed) {
      await releaseQuota(authContext.supabase, workspaceId, 'ai_explanations');
    }
    console.error('AI chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
