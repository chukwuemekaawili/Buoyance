-- Add missing UPDATE and DELETE policies for tax_calculations table
-- This ensures defense-in-depth: users can only modify/delete their own calculations

CREATE POLICY "tax_calcs_update_own" 
ON public.tax_calculations 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tax_calcs_delete_own" 
ON public.tax_calculations 
FOR DELETE 
USING (auth.uid() = user_id);