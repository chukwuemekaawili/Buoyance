-- Add TIN field to profiles table for Tax Identification Number
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tin TEXT;

-- Add index for TIN lookups
CREATE INDEX IF NOT EXISTS idx_profiles_tin ON public.profiles(tin);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.tin IS '10-digit Tax Identification Number from JTB';