-- Restrict receipt uploads to workspace-owned object paths.
-- The OCR function requires receipt paths shaped as <workspace_id>/<object_id>.<ext>,
-- so storage insert policy must enforce the same workspace boundary.

UPDATE storage.buckets
SET public = false
WHERE id = 'receipts';

DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can upload receipts" ON storage.objects;

CREATE POLICY "Workspace members can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.workspace_users wu
    WHERE wu.workspace_id::text = (storage.foldername(name))[1]
      AND wu.user_id = auth.uid()
  )
);
