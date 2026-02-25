-- =================================================================================
-- SPRINT 1: WORKSPACE FOUNDATION (IDEMPOTENT / SAFE RE-RUN VERSION)
-- Adds multi-tenant Organizations, Users junction, and applies workspace_id scoping
-- =================================================================================

-- 1. Create organizations table safely
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  entity_type text DEFAULT 'Individual' CHECK (entity_type IN ('Individual', 'Sole_Proprietor', 'Limited_Company')),
  tin varchar(20),
  rc_number varchar(20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Create workspace_users junction table safely
CREATE TABLE IF NOT EXISTS public.workspace_users (
  workspace_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Member' CHECK (role IN ('Owner', 'Admin', 'Member', 'External_Accountant')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_workspace_users_user ON public.workspace_users(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_workspace ON public.workspace_users(workspace_id);

-- Enable RLS for workspace_users
ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;

-- 3. Update Profiles table to store active workspace
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_workspace_id uuid REFERENCES public.organizations(id);

-- 4. RLS Policies for Organizations (Drop first to allow re-runs)
DROP POLICY IF EXISTS "org_select" ON public.organizations;
CREATE POLICY "org_select" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "org_update" ON public.organizations;
CREATE POLICY "org_update" ON public.organizations
  FOR UPDATE USING (
    id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin'))
  );

DROP POLICY IF EXISTS "org_insert" ON public.organizations;
CREATE POLICY "org_insert" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. RLS Policies for Workspace_Users (Drop first)
DROP POLICY IF EXISTS "wu_select" ON public.workspace_users;
CREATE POLICY "wu_select" ON public.workspace_users
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "wu_insert" ON public.workspace_users;
CREATE POLICY "wu_insert" ON public.workspace_users
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin'))
    OR user_id = auth.uid() -- Allow self-insert during org creation trigger
  );

-- 6. Add workspace_id parameter to context-aware tables safely
ALTER TABLE public.filings ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.tax_calculations ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.organizations(id);

-- 7. PL/PGSQL Trigger to Auto-Create "Personal Workspace" on Signup/Profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_name text;
BEGIN
  -- Determine name from profile or generic
  IF NEW.display_name IS NOT NULL THEN
    v_name := NEW.display_name || '''s Personal Workspace';
  ELSIF NEW.first_name IS NOT NULL THEN
    v_name := NEW.first_name || '''s Personal Workspace';
  ELSE
    v_name := 'Personal Workspace';
  END IF;

  -- 1. Create Organization
  INSERT INTO public.organizations (name, entity_type)
  VALUES (v_name, 'Individual')
  RETURNING id INTO v_workspace_id;

  -- 2. Add User as Owner
  INSERT INTO public.workspace_users (workspace_id, user_id, role)
  VALUES (v_workspace_id, NEW.id, 'Owner');

  -- 3. Set as default workspace
  UPDATE public.profiles
  SET default_workspace_id = v_workspace_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Attach trigger to profiles table
DROP TRIGGER IF EXISTS on_profile_created_create_workspace ON public.profiles;
CREATE TRIGGER on_profile_created_create_workspace
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_workspace();

-- 8. Backfill existing users
DO $$
DECLARE
  r_user RECORD;
  v_workspace_id uuid;
  v_name text;
BEGIN
  FOR r_user IN SELECT * FROM public.profiles WHERE default_workspace_id IS NULL LOOP
    
    IF r_user.display_name IS NOT NULL THEN
      v_name := r_user.display_name || '''s Personal Workspace';
    ELSIF r_user.first_name IS NOT NULL THEN
      v_name := r_user.first_name || '''s Personal Workspace';
    ELSE
      v_name := 'Personal Workspace';
    END IF;

    -- Create org
    INSERT INTO public.organizations (name, entity_type)
    VALUES (v_name, 'Individual')
    RETURNING id INTO v_workspace_id;

    -- Create membership
    INSERT INTO public.workspace_users (workspace_id, user_id, role)
    VALUES (v_workspace_id, r_user.id, 'Owner')
    ON CONFLICT DO NOTHING;

    -- Update profile
    UPDATE public.profiles
    SET default_workspace_id = v_workspace_id
    WHERE id = r_user.id;

    -- Backfill filings
    UPDATE public.filings
    SET workspace_id = v_workspace_id
    WHERE user_id = r_user.id AND workspace_id IS NULL;

    -- Backfill payments
    UPDATE public.payments
    SET workspace_id = v_workspace_id
    WHERE user_id = r_user.id AND workspace_id IS NULL;

    -- Backfill tax calculations
    UPDATE public.tax_calculations
    SET workspace_id = v_workspace_id
    WHERE user_id = r_user.id AND workspace_id IS NULL;

  END LOOP;
END;
$$;

-- 9. Update tenant RLS policies to use workspace_id OR user_id (for hybrid transition phase)
-- Filings
DROP POLICY IF EXISTS "filings_select_own" ON public.filings;
DROP POLICY IF EXISTS "filings_select_workspace" ON public.filings;
CREATE POLICY "filings_select_workspace" ON public.filings
  FOR SELECT USING (
    (workspace_id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid()) OR user_id = auth.uid())
    AND archived = false
  );

DROP POLICY IF EXISTS "filings_insert_own" ON public.filings;
DROP POLICY IF EXISTS "filings_insert_workspace" ON public.filings;
CREATE POLICY "filings_insert_workspace" ON public.filings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND status = 'draft' AND archived = false
  );

DROP POLICY IF EXISTS "filings_update_own_draft" ON public.filings;
DROP POLICY IF EXISTS "filings_update_workspace_draft" ON public.filings;
CREATE POLICY "filings_update_workspace_draft" ON public.filings
  FOR UPDATE USING (
    (workspace_id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid()) OR user_id = auth.uid())
    AND (status = 'draft' OR archived = true)
  );

-- Payments
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
DROP POLICY IF EXISTS "payments_select_workspace" ON public.payments;
CREATE POLICY "payments_select_workspace" ON public.payments
  FOR SELECT USING (
    (workspace_id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid()) OR user_id = auth.uid())
    AND archived = false
  );

-- Tax Calculations
DROP POLICY IF EXISTS "calculations_select_own" ON public.tax_calculations;
DROP POLICY IF EXISTS "calculations_select_workspace" ON public.tax_calculations;
CREATE POLICY "calculations_select_workspace" ON public.tax_calculations
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid()) 
    OR user_id = auth.uid()
  );
