-- Workspace Invitations
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('Admin', 'Member', 'External_Accountant')),
  invoker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token UUID DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Unique index to prevent multiple pending invites for the same email in the same workspace
CREATE UNIQUE INDEX idx_unique_pending_invite ON public.workspace_invitations (workspace_id, email) WHERE status = 'pending';

-- Audit Logs (Add workspace_id to existing table for tenant boundaries)
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- RLS for workspace_invitations
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View invitations for own workspace"
ON public.workspace_invitations FOR SELECT
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can invite"
ON public.workspace_invitations FOR INSERT
WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin')
));

CREATE POLICY "Admins can revoke"
ON public.workspace_invitations FOR UPDATE
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin')
));

-- RLS for audit_logs
-- Drop existing policies if any conflict (though we might just add a new select policy, it's safer to scope it)
DROP POLICY IF EXISTS "audit_logs_select_privileged" ON public.audit_logs;

CREATE POLICY "View audit logs for own workspace"
ON public.audit_logs FOR SELECT
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin', 'External_Accountant')
));

-- RPC for securely accepting an invitation
CREATE OR REPLACE FUNCTION accept_workspace_invitation(invite_token UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inv_record RECORD;
BEGIN
  -- Find the pending invitation
  SELECT * INTO inv_record
  FROM public.workspace_invitations
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- Ensure the caller's email matches the invitation
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != inv_record.email THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address';
  END IF;

  -- Insert user into workspace_users
  INSERT INTO public.workspace_users (workspace_id, user_id, role, accepted_at)
  VALUES (inv_record.workspace_id, auth.uid(), inv_record.role, NOW())
  ON CONFLICT (workspace_id, user_id) 
  DO UPDATE SET role = EXCLUDED.role, accepted_at = EXCLUDED.accepted_at;

  -- Mark invitation as accepted
  UPDATE public.workspace_invitations
  SET status = 'accepted'
  WHERE id = inv_record.id;

  -- Log the event using existing table structure (actor_user_id)
  INSERT INTO public.audit_logs (workspace_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    inv_record.workspace_id, 
    auth.uid(), 
    'invite_accepted', 
    'workspace_invitation', 
    inv_record.id,
    jsonb_build_object('role_granted', inv_record.role)
  );

  RETURN true;
END;
$$;
