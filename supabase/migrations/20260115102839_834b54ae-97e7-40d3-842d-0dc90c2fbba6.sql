-- Create secure RPC function for admin to set user roles
-- This function handles role assignment with full audit logging

CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  target_user_id uuid,
  new_role app_role
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
  previous_role app_role;
  result jsonb;
BEGIN
  -- Get the calling user's ID
  caller_id := auth.uid();
  
  -- Check if caller is an admin
  IF NOT has_role(caller_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Only admins can assign roles';
  END IF;
  
  -- Get the user's current role (if any)
  SELECT role INTO previous_role
  FROM public.user_roles
  WHERE user_id = target_user_id;
  
  -- Upsert the new role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET role = new_role;
  
  -- Write audit log entry
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
    target_user_id::text,
    CASE WHEN previous_role IS NOT NULL 
      THEN jsonb_build_object('role', previous_role::text) 
      ELSE NULL 
    END,
    jsonb_build_object('role', new_role::text),
    jsonb_build_object(
      'target_user_id', target_user_id::text,
      'new_role', new_role::text,
      'previous_role', COALESCE(previous_role::text, 'none')
    )
  );
  
  -- Return success with previous role info
  result := jsonb_build_object(
    'success', true,
    'previous_role', COALESCE(previous_role::text, 'none'),
    'new_role', new_role::text,
    'target_user_id', target_user_id::text
  );
  
  RETURN result;
END;
$$;

-- Create function to get users list for admin (includes profile data)
-- Using assigned_role instead of current_role (reserved keyword)
CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  user_type app_role,
  created_at timestamptz,
  assigned_role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin or auditor
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: Admin or Auditor role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.display_name,
    p.user_type,
    p.created_at,
    ur.role as assigned_role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users_list() TO authenticated;