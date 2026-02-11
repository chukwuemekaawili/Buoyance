-- Add UNIQUE constraint on user_roles.user_id to enforce one role per user
-- First, drop any duplicate roles (keep the most recent one)
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id 
  AND a.created_at < b.created_at;

-- Drop the existing unique constraint on (user_id, role) if it exists
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Add unique constraint on user_id only (one role per user)
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);