-- Epic J: E-Invoicing & Moat Features (DigiTax + TCC)

-- =========================================================================
-- 1. Tax Clearance Certificates (TCC)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.tcc_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tax_year INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected')),
  application_number TEXT UNIQUE, -- FIRS/LIRS application ID
  tcc_number TEXT UNIQUE,         -- The final certificate number
  tcc_document_url TEXT,          -- Link to the issued PDF
  remita_rrr TEXT,                -- Remita Retrieval Reference if a processing fee was paid
  processing_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, tax_year)  -- One TCC application per workspace per year
);

-- RLS for TCC
ALTER TABLE public.tcc_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View TCCs for own workspace"
ON public.tcc_requests FOR SELECT
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid()
));

CREATE POLICY "Manage TCCs for own workspace"
ON public.tcc_requests FOR ALL
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin', 'External_Accountant')
));

-- =========================================================================
-- 2. Receipts & Attachments on Payments (Remita Uploads)
-- =========================================================================
-- Allow users to upload Remita payment proofs directly onto existing payments

ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS remita_rrr TEXT;

-- =========================================================================
-- 3. DigiTax MBS (Master Business System) Invoices (Read-Only Sync)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.digitax_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  digitax_uuid TEXT UNIQUE NOT NULL, -- The external DigiTax UUID
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  customer_name TEXT,
  customer_tin TEXT,
  total_amount_kobo BIGINT NOT NULL,
  vat_amount_kobo BIGINT DEFAULT 0,
  status TEXT DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'paid', 'cancelled')),
  is_synced_to_ledger BOOLEAN DEFAULT false, -- Has this been pushed into Buoyance incomes table?
  linked_income_id UUID REFERENCES public.incomes(id) ON DELETE SET NULL,
  raw_payload JSONB, -- Store full DigiTax JSON payload for audit and future expansion
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for DigiTax
ALTER TABLE public.digitax_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View DigiTax Invoices for own workspace"
ON public.digitax_invoices FOR SELECT
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid()
));

CREATE POLICY "Manage DigiTax Invoices for own workspace"
ON public.digitax_invoices FOR ALL
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin', 'Member', 'External_Accountant')
));
