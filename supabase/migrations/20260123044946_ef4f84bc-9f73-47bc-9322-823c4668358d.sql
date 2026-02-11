-- Fix get_admin_users_list to properly cast email from varchar to text
CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  user_type app_role,
  created_at timestamp with time zone,
  assigned_role app_role,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow admin or auditor to call this function
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'auditor')) THEN
    RAISE EXCEPTION 'Access denied: requires admin or auditor role';
  END IF;

  RETURN QUERY
  SELECT 
    au.id AS user_id,
    COALESCE(p.display_name, split_part(au.email::text, '@', 1))::text AS display_name,
    COALESCE(p.user_type, 'individual'::app_role) AS user_type,
    COALESCE(p.created_at, au.created_at) AS created_at,
    COALESCE(ur.role, 'individual'::app_role) AS assigned_role,
    au.email::text AS email
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  ORDER BY au.created_at DESC;
END;
$$;