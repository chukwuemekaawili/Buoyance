-- Create contact_submissions table for contact form
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Add indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at 
ON public.contact_submissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status 
ON public.contact_submissions(status);

-- Enable RLS
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public contact form)
CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can view - using has_role function
CREATE POLICY "Admins can view contact submissions"
ON public.contact_submissions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update (mark as read, replied, etc)
CREATE POLICY "Admins can update contact submissions"
ON public.contact_submissions FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));