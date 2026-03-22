-- Update the receipts bucket to be public so the Edge Function can download images via HTTP unconditionally
UPDATE storage.buckets 
SET public = true 
WHERE id = 'receipts';
