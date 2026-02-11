-- Add composite index for the My Calculations query
-- This index covers the common query: WHERE user_id = X AND archived = false ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_tax_calculations_user_created 
ON public.tax_calculations(user_id, created_at DESC) 
WHERE archived = false;