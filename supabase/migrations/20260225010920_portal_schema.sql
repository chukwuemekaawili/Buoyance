-- Portal Schema: Mapping Buoyance calculations directly to Nigerian Government Webforms

-- 1. Portal Forms (e.g. FIRS TaxPro Max CIT, LIRS eTax PAYE)
CREATE TABLE IF NOT EXISTS public.portal_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency TEXT NOT NULL CHECK (agency IN ('FIRS', 'LIRS', 'KIRS', 'SIRS')),
  tax_type TEXT NOT NULL CHECK (tax_type IN ('CIT', 'VAT', 'PAYE', 'WHT', 'PIT')),
  form_name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '2025_v1',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Portal Fields (The exact input boxes on the government website)
CREATE TABLE IF NOT EXISTS public.portal_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.portal_forms(id) ON DELETE CASCADE,
  schedule_name TEXT, -- E.g. "Schedule 1", "Part A"
  field_name TEXT NOT NULL, -- Exact label on the portal
  field_type TEXT DEFAULT 'number' CHECK (field_type IN ('number', 'text', 'boolean', 'date')),
  is_calculated_by_portal BOOLEAN DEFAULT false, -- If the portal auto-calculates this, Buoyance shows Match-or-Explain
  mapping_path TEXT, -- JSON path inside our tax_calculations.breakdown array to pull the value from
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Portal Submissions (Ties a Buoyance Filing to its external portal counterpart)
CREATE TABLE IF NOT EXISTS public.portal_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  filing_id UUID REFERENCES public.filings(id) ON DELETE CASCADE NOT NULL,
  form_id UUID REFERENCES public.portal_forms(id) ON DELETE SET NULL,
  portal_reference_number TEXT, -- E.g., Assessment Number given by FIRS upon submission
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'assessed', 'paid')),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (filing_id) -- One submission record per filing
);

-- Enable RLS
ALTER TABLE public.portal_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_submissions ENABLE ROW LEVEL SECURITY;

-- Forms & Fields are globally readable system configuration
CREATE POLICY "Publicly accessible portal forms" ON public.portal_forms FOR SELECT USING (true);
CREATE POLICY "Publicly accessible portal fields" ON public.portal_fields FOR SELECT USING (true);

-- Portal Submissions are strictly tenant-bound
CREATE POLICY "View portal submissions for own workspace"
ON public.portal_submissions FOR SELECT
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid()
));

CREATE POLICY "Manage portal submissions"
ON public.portal_submissions FOR ALL
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin', 'Member', 'External_Accountant')
));

-- =========================================================================
-- Seed Core Form Structures (TaxPro Max CIT & VAT for 2025)
-- =========================================================================

-- FIRS CIT Form
INSERT INTO public.portal_forms (id, agency, tax_type, form_name, description)
VALUES ('11111111-1111-1111-1111-111111111111', 'FIRS', 'CIT', 'TaxPro Max CIT Return', 'Standard corporate income tax return on FIRS TaxPro Max portal.')
ON CONFLICT DO NOTHING;

-- CIT Fields Binding
INSERT INTO public.portal_fields (form_id, schedule_name, field_name, mapping_path, display_order)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Schedule 1: Taxable Profit', 'Total Revenue / Turnover', 'grossIncome', 10),
  ('11111111-1111-1111-1111-111111111111', 'Schedule 1: Taxable Profit', 'Allowable Business Expenses', 'allowableExpenses', 20),
  ('11111111-1111-1111-1111-111111111111', 'Schedule 1: Taxable Profit', 'Assessable Profit', 'assessableProfit', 30),
  ('11111111-1111-1111-1111-111111111111', 'Schedule 4: Capital Allowances', 'Capital Allowances Claimed', 'breakdown.capital_allowance', 40),
  ('11111111-1111-1111-1111-111111111111', 'Schedule 4: Capital Allowances', 'Total Taxable Profit', 'taxableProfit', 50),
  ('11111111-1111-1111-1111-111111111111', 'Tax Computation', 'Companies Income Tax Payable (30%)', 'breakdown.base_tax', 60),
  ('11111111-1111-1111-1111-111111111111', 'Tax Computation', 'Tertiary Education Trust Fund (EDT) (3%)', 'breakdown.education_tax', 70);

-- FIRS VAT Form
INSERT INTO public.portal_forms (id, agency, tax_type, form_name, description)
VALUES ('22222222-2222-2222-2222-222222222222', 'FIRS', 'VAT', 'TaxPro Max Value Added Tax Return', 'Monthly VAT return form.')
ON CONFLICT DO NOTHING;

-- VAT Fields Binding
INSERT INTO public.portal_fields (form_id, schedule_name, field_name, mapping_path, display_order)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'Output VAT', 'Total Sales / Income', 'grossIncome', 10),
  ('22222222-2222-2222-2222-222222222222', 'Output VAT', 'Exempted / Zero Rated Sales', 'breakdown.exempt_sales', 20),
  ('22222222-2222-2222-2222-222222222222', 'Output VAT', 'VAT Charged on Sales (Output VAT)', 'breakdown.output_vat', 30),
  ('22222222-2222-2222-2222-222222222222', 'Input VAT', 'Total Purchases', 'allowableExpenses', 40),
  ('22222222-2222-2222-2222-222222222222', 'Input VAT', 'VAT Paid on Purchases (Input VAT)', 'breakdown.input_vat', 50),
  ('22222222-2222-2222-2222-222222222222', 'Summary', 'VAT Payable', 'taxAmount', 60);
