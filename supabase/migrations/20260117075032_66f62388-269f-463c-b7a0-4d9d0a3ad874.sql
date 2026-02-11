-- PHASE 1: VAT Enhancement Fields for expenses and incomes
-- Add vatable and VAT amount fields to enable real VAT optimization (Output VAT - Input VAT)

-- Expenses: Add VAT-related fields
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS vatable boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS input_vat_kobo text NULL,
ADD COLUMN IF NOT EXISTS invoice_ref text NULL;

COMMENT ON COLUMN public.expenses.vatable IS 'Whether this expense has a VAT invoice (VATable purchase)';
COMMENT ON COLUMN public.expenses.input_vat_kobo IS 'Input VAT amount in kobo (can be manually entered or calculated at 7.5%)';
COMMENT ON COLUMN public.expenses.invoice_ref IS 'VAT invoice reference number';

-- Incomes: Add VAT-related fields
ALTER TABLE public.incomes 
ADD COLUMN IF NOT EXISTS vatable boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS output_vat_kobo text NULL;

COMMENT ON COLUMN public.incomes.vatable IS 'Whether this income is subject to VAT (VATable sale/service)';
COMMENT ON COLUMN public.incomes.output_vat_kobo IS 'Output VAT amount in kobo (optional override, otherwise calculated at 7.5%)';

-- Crypto transactions: Add fee field
ALTER TABLE public.crypto_transactions 
ADD COLUMN IF NOT EXISTS fee_kobo text NULL;

COMMENT ON COLUMN public.crypto_transactions.fee_kobo IS 'Transaction fee in kobo (reduces capital gains)';

-- PHASE 2: App Settings table for global configuration (Free Mode, etc.)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

COMMENT ON TABLE public.app_settings IS 'Global application settings (free mode, feature flags, etc.)';

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read
CREATE POLICY "app_settings_select_authenticated" ON public.app_settings
  FOR SELECT TO authenticated
  USING (true);

-- RLS: only admins can insert/update
CREATE POLICY "app_settings_insert_admin" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "app_settings_update_admin" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default free mode setting
INSERT INTO public.app_settings (key, value)
VALUES ('global_config', '{"free_mode_enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add new notification types by extending existing table usage (no schema change needed)
-- The notifications table already supports custom types via the 'type' text column