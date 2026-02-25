-- Fix infinite recursion in workspace_users by simplifying the SELECT policy.
-- The UI currently only needs users to see their own workspace_user records to populate the switcher,
-- and organization policies need to check if the user is in the workspace.

-- Overwrite the existing recursive policies

DROP POLICY IF EXISTS "wu_select" ON public.workspace_users;
CREATE POLICY "wu_select" ON public.workspace_users
  FOR SELECT USING (
    -- Simplify: A user can see their own memberships. 
    -- If we need them to see other members of the same workspace later, 
    -- we should use a security definer helper function.
    user_id = auth.uid()
  );
