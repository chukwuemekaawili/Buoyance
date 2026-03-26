-- Add work_state column to profiles table to explicitly track state of tax residence
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS work_state text;

-- Add a comment explaining usage for future reference
COMMENT ON COLUMN public.profiles.work_state IS 'The user''s state of tax residence used for routing PIT payments to correct State IRS.';
