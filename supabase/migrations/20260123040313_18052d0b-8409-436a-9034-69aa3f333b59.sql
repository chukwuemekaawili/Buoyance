-- Create storage bucket for media assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', false)
ON CONFLICT (id) DO NOTHING;

-- Create media_assets table to track uploaded files
CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL DEFAULT 'media',
  path text NOT NULL UNIQUE,
  mime_type text,
  size_bytes bigint,
  original_name text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Admin can select/delete all media
CREATE POLICY "Admin can manage all media"
ON public.media_assets
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Users can view their own media
CREATE POLICY "Users can view own media"
ON public.media_assets
FOR SELECT
TO authenticated
USING (uploaded_by = auth.uid());

-- Users can insert their own media
CREATE POLICY "Users can insert own media"
ON public.media_assets
FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());

-- Users can delete their own media
CREATE POLICY "Users can delete own media"
ON public.media_assets
FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

-- Storage policies for media bucket
CREATE POLICY "Admin can access all media files"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'media' AND has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'media' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can access own media files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own media files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own media files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add index for faster lookups
CREATE INDEX idx_media_assets_uploaded_by ON public.media_assets(uploaded_by);
CREATE INDEX idx_media_assets_entity ON public.media_assets(entity_type, entity_id);
CREATE INDEX idx_media_assets_created_at ON public.media_assets(created_at DESC);