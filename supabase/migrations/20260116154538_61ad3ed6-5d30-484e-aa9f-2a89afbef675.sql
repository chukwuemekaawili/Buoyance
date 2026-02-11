-- Fix BLOCKER #1: Allow anonymous users to read published tax rules
-- This enables the calculators to work without requiring login

-- Drop the existing policy (it only applies to 'authenticated' role)
DROP POLICY IF EXISTS "tax_rules_select_published" ON public.tax_rules;

-- Create new policy that allows BOTH anon and authenticated to read published rules
CREATE POLICY "tax_rules_select_published" ON public.tax_rules
FOR SELECT
TO anon, authenticated
USING ((published = true) AND (archived = false));