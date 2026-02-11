-- Add WHT credit columns to incomes table
ALTER TABLE public.incomes 
ADD COLUMN IF NOT EXISTS wht_deducted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS wht_credit_kobo bigint DEFAULT 0;

-- Add vatable and output_vat_kobo columns to incomes if not exists
ALTER TABLE public.incomes 
ADD COLUMN IF NOT EXISTS vatable boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS output_vat_kobo bigint DEFAULT NULL;

-- Add check constraint to ensure wht_credit is not negative
ALTER TABLE public.incomes 
ADD CONSTRAINT chk_wht_credit_non_negative CHECK (wht_credit_kobo >= 0);

-- Add invoice_ref to expenses if not exists
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS invoice_ref text DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.incomes.wht_deducted IS 'Whether WHT was deducted at source';
COMMENT ON COLUMN public.incomes.wht_credit_kobo IS 'Amount of WHT deducted in kobo (for tax credit)';
COMMENT ON COLUMN public.incomes.vatable IS 'Whether this income is VATable';
COMMENT ON COLUMN public.incomes.output_vat_kobo IS 'Output VAT amount in kobo (override or calculated at 7.5%)';