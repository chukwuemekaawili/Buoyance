-- Add tax_identity column to profiles table
-- This separates tax classification from role-based access (user_type/app_role)

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tax_identity text;

-- Add a check constraint to validate allowed values
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_tax_identity_check 
CHECK (tax_identity IS NULL OR tax_identity IN (
  'freelancer',   -- Freelancer / Sole Proprietor
  'enterprise',   -- Small Business Enterprise / Business Name
  'ltd',          -- Limited Company (LTD)
  'salary',       -- Salary Earner (PAYE)
  'partnership',  -- Partnership
  'ngo',          -- NGO / Non-Profit
  'cooperative'   -- Cooperative Society
));

-- Migrate existing user_type values to tax_identity where applicable
-- This maps legacy values to the new tax_identity column
UPDATE public.profiles
SET tax_identity = CASE 
  WHEN user_type = 'individual' THEN 'salary'
  WHEN user_type = 'freelancer' THEN 'freelancer'
  WHEN user_type = 'sme' THEN 'enterprise'
  WHEN user_type = 'corporate' THEN 'ltd'
  ELSE NULL
END
WHERE tax_identity IS NULL;