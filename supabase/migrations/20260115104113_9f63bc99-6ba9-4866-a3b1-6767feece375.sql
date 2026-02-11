-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS public.get_admin_users_list();

-- Recreate get_admin_users_list with email from auth.users
CREATE FUNCTION public.get_admin_users_list()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  user_type app_role,
  created_at timestamptz,
  assigned_role app_role,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin or auditor to call this function
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'auditor')) THEN
    RAISE EXCEPTION 'Access denied: requires admin or auditor role';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.display_name,
    p.user_type,
    p.created_at,
    COALESCE(ur.role, 'individual'::app_role) AS assigned_role,
    au.email
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  LEFT JOIN auth.users au ON au.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_admin_users_list() TO authenticated;

-- Create bulk role assignment function for admins
CREATE OR REPLACE FUNCTION public.admin_bulk_set_user_roles(
  target_user_ids uuid[],
  new_role app_role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  updated_count int := 0;
  target_id uuid;
  prev_role app_role;
BEGIN
  -- Check caller is admin
  IF NOT has_role(caller_id, 'admin') THEN
    RAISE EXCEPTION 'Access denied: only admins can assign roles';
  END IF;

  -- Process each user
  FOREACH target_id IN ARRAY target_user_ids LOOP
    -- Get previous role
    SELECT role INTO prev_role
    FROM public.user_roles
    WHERE user_id = target_id;

    -- Upsert role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_id, new_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

    -- Audit log
    INSERT INTO public.audit_logs (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      before_json,
      after_json,
      metadata
    ) VALUES (
      caller_id,
      'role.updated',
      'user_role',
      target_id::text,
      jsonb_build_object('role', COALESCE(prev_role, 'individual')),
      jsonb_build_object('role', new_role),
      jsonb_build_object('target_user_id', target_id, 'new_role', new_role, 'bulk_operation', true)
    );

    updated_count := updated_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'updated_count', updated_count,
    'new_role', new_role
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_bulk_set_user_roles(uuid[], app_role) TO authenticated;