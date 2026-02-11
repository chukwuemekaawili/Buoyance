-- PRD Compliance Migration: Immutability, Corrections, and Enhanced Audit Trail
-- This migration adds supersedes_id for correction workflow and ensures immutability

-- 1. Add supersedes_id to incomes for correction workflow
ALTER TABLE public.incomes 
ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES public.incomes(id),
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
  CHECK (status IN ('active', 'superseded', 'corrected', 'archived'));

-- 2. Add supersedes_id to expenses for correction workflow  
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES public.expenses(id),
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'superseded', 'corrected', 'archived'));

-- 3. Add supersedes_id to crypto_transactions for correction workflow
ALTER TABLE public.crypto_transactions
ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES public.crypto_transactions(id),
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'superseded', 'corrected', 'archived'));

-- 4. Add supersedes_id to payments for correction workflow
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES public.payments(id);

-- 5. Add supersedes_id to filings for correction workflow
ALTER TABLE public.filings
ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES public.filings(id);

-- 6. Enhance tax_calculations with PRD-required fields
ALTER TABLE public.tax_calculations
ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES public.tax_calculations(id),
ADD COLUMN IF NOT EXISTS effective_date_used DATE,
ADD COLUMN IF NOT EXISTS legal_basis_json JSONB,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'finalized', 'archived', 'superseded'));

-- 7. Update existing calculations to have correct status based on finalized flag
UPDATE public.tax_calculations 
SET status = CASE 
  WHEN archived = true THEN 'archived'
  WHEN finalized = true THEN 'finalized'
  ELSE 'draft'
END
WHERE status IS NULL OR status = 'draft';

-- 8. Add consent_texts table for versioned consent management
CREATE TABLE IF NOT EXISTS public.consent_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  text_content TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('account_creation', 'calculation', 'filing')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on consent_texts
ALTER TABLE public.consent_texts ENABLE ROW LEVEL SECURITY;

-- Policies for consent_texts
CREATE POLICY "consent_texts_select_all" ON public.consent_texts
FOR SELECT USING (true);

CREATE POLICY "consent_texts_insert_admin" ON public.consent_texts
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "consent_texts_update_admin" ON public.consent_texts
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. Add context column to consents table
ALTER TABLE public.consents
ADD COLUMN IF NOT EXISTS context TEXT DEFAULT 'account_creation'
  CHECK (context IN ('account_creation', 'calculation', 'filing'));

-- 10. Create indexes for correction lookups
CREATE INDEX IF NOT EXISTS idx_incomes_supersedes ON public.incomes(supersedes_id) WHERE supersedes_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_supersedes ON public.expenses(supersedes_id) WHERE supersedes_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crypto_supersedes ON public.crypto_transactions(supersedes_id) WHERE supersedes_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_supersedes ON public.payments(supersedes_id) WHERE supersedes_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_filings_supersedes ON public.filings(supersedes_id) WHERE supersedes_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calculations_supersedes ON public.tax_calculations(supersedes_id) WHERE supersedes_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calculations_status ON public.tax_calculations(status);

-- 11. Add nta_section and law_reference_json to tax_rules if not exists
ALTER TABLE public.tax_rules
ADD COLUMN IF NOT EXISTS legal_reference TEXT,
ADD COLUMN IF NOT EXISTS nta_section TEXT;

-- 12. Insert default consent texts for the three contexts
INSERT INTO public.consent_texts (version, text_content, text_hash, context, is_active)
VALUES 
  ('1.0.0-account', 'I agree to the Terms of Service and Privacy Policy. I understand that Buoyance is a tax information tool and does not constitute professional tax advice. Data will be retained for 7 years per regulatory requirements.', 'sha256_account_v1', 'account_creation', true),
  ('1.0.0-calculation', 'I confirm the accuracy of the data I have entered and consent to Buoyance calculating my tax liability based on the active tax rules. This calculation is for informational purposes only.', 'sha256_calculation_v1', 'calculation', true),
  ('1.0.0-filing', 'I confirm that all information in this filing is accurate and complete to the best of my knowledge. I understand that submitting false information may result in penalties under the Nigeria Tax Act 2025.', 'sha256_filing_v1', 'filing', true)
ON CONFLICT (version) DO NOTHING;