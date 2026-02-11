-- Clean up media feature artifacts
-- Drop the media_assets table and related policies

-- First drop the policies on storage.objects for media bucket
DROP POLICY IF EXISTS "Admin can access all media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can access own media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media files" ON storage.objects;

-- Drop the policies on media_assets table
DROP POLICY IF EXISTS "Admin can manage all media" ON public.media_assets;
DROP POLICY IF EXISTS "Users can view own media" ON public.media_assets;
DROP POLICY IF EXISTS "Users can insert own media" ON public.media_assets;
DROP POLICY IF EXISTS "Users can delete own media" ON public.media_assets;

-- Drop the indexes
DROP INDEX IF EXISTS idx_media_assets_uploaded_by;
DROP INDEX IF EXISTS idx_media_assets_entity;
DROP INDEX IF EXISTS idx_media_assets_created_at;

-- Drop the table
DROP TABLE IF EXISTS public.media_assets;

-- Remove the storage bucket (this only removes the bucket definition, not the files if any exist)
DELETE FROM storage.buckets WHERE id = 'media';