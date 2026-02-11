-- Add tax_exempt column to incomes table
ALTER TABLE public.incomes 
ADD COLUMN tax_exempt boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.incomes.tax_exempt IS 'Whether this income is exempt from taxation (e.g., gifts, grants, refunds)';