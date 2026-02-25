-- =========================================================================
-- SPRINT 6: OCR Pipeline Foundation
-- Create storage bucket for receipts and update ledger tables
-- =========================================================================

-- 1. Add new columns to 'expenses' table to support OCR extraction
ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS merchant_name TEXT;

-- 2. Add new columns to 'incomes' table to support OCR extraction / invoice uploads
ALTER TABLE public.incomes
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 3. Create the 'receipts' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Setup Storage RLS Policies for the 'receipts' bucket
-- Authenticated users can upload to the receipts bucket
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
);

-- Users can only view and update their own uploaded receipts
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' 
  AND owner = auth.uid()
);

CREATE POLICY "Users can update own receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts' 
  AND owner = auth.uid()
);

CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' 
  AND owner = auth.uid()
);
