-- =============================================
-- PHASE 1: RBAC + AUDIT + CONSENT FOUNDATION
-- =============================================

-- 1. Create app_role enum for user types
CREATE TYPE public.app_role AS ENUM (
  'individual',
  'freelancer', 
  'sme',
  'corporate',
  'accountant',
  'admin',
  'auditor'
);

-- 2. Create permission keys enum
CREATE TYPE public.app_permission AS ENUM (
  'calculator.use',
  'calculation.save',
  'calculation.view_own',
  'calculation.view_all',
  'filing.create',
  'filing.submit',
  'filing.view_own',
  'filing.view_all',
  'payment.create',
  'payment.view_own',
  'payment.view_all',
  'tax_rules.view',
  'tax_rules.publish',
  'audit.view',
  'audit.export',
  'user.manage',
  'role.assign'
);

-- 3. Create roles table (reference table for role metadata)
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name public.app_role UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default roles
INSERT INTO public.roles (name, description) VALUES
  ('individual', 'Individual taxpayer'),
  ('freelancer', 'Freelance/self-employed taxpayer'),
  ('sme', 'Small and Medium Enterprise'),
  ('corporate', 'Corporate entity'),
  ('accountant', 'Professional accountant managing clients'),
  ('admin', 'System administrator'),
  ('auditor', 'Read-only audit access');

-- 4. Create permissions table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key public.app_permission UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert all permissions
INSERT INTO public.permissions (key, description) VALUES
  ('calculator.use', 'Use tax calculators'),
  ('calculation.save', 'Save tax calculations'),
  ('calculation.view_own', 'View own calculations'),
  ('calculation.view_all', 'View all users calculations'),
  ('filing.create', 'Create tax filings'),
  ('filing.submit', 'Submit tax filings'),
  ('filing.view_own', 'View own filings'),
  ('filing.view_all', 'View all filings'),
  ('payment.create', 'Create payment records'),
  ('payment.view_own', 'View own payments'),
  ('payment.view_all', 'View all payments'),
  ('tax_rules.view', 'View tax rules'),
  ('tax_rules.publish', 'Publish/modify tax rules'),
  ('audit.view', 'View audit logs'),
  ('audit.export', 'Export audit logs'),
  ('user.manage', 'Manage users'),
  ('role.assign', 'Assign roles to users');

-- 5. Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name public.app_role NOT NULL,
  permission_key public.app_permission NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_name, permission_key)
);

-- Assign permissions to roles
-- Individual: basic calculator access
INSERT INTO public.role_permissions (role_name, permission_key) VALUES
  ('individual', 'calculator.use'),
  ('individual', 'calculation.save'),
  ('individual', 'calculation.view_own'),
  ('individual', 'filing.create'),
  ('individual', 'filing.submit'),
  ('individual', 'filing.view_own'),
  ('individual', 'payment.create'),
  ('individual', 'payment.view_own'),
  ('individual', 'tax_rules.view');

-- Freelancer: same as individual
INSERT INTO public.role_permissions (role_name, permission_key) VALUES
  ('freelancer', 'calculator.use'),
  ('freelancer', 'calculation.save'),
  ('freelancer', 'calculation.view_own'),
  ('freelancer', 'filing.create'),
  ('freelancer', 'filing.submit'),
  ('freelancer', 'filing.view_own'),
  ('freelancer', 'payment.create'),
  ('freelancer', 'payment.view_own'),
  ('freelancer', 'tax_rules.view');

-- SME: same as individual
INSERT INTO public.role_permissions (role_name, permission_key) VALUES
  ('sme', 'calculator.use'),
  ('sme', 'calculation.save'),
  ('sme', 'calculation.view_own'),
  ('sme', 'filing.create'),
  ('sme', 'filing.submit'),
  ('sme', 'filing.view_own'),
  ('sme', 'payment.create'),
  ('sme', 'payment.view_own'),
  ('sme', 'tax_rules.view');

-- Corporate: same as individual
INSERT INTO public.role_permissions (role_name, permission_key) VALUES
  ('corporate', 'calculator.use'),
  ('corporate', 'calculation.save'),
  ('corporate', 'calculation.view_own'),
  ('corporate', 'filing.create'),
  ('corporate', 'filing.submit'),
  ('corporate', 'filing.view_own'),
  ('corporate', 'payment.create'),
  ('corporate', 'payment.view_own'),
  ('corporate', 'tax_rules.view');

-- Accountant: can view client data (placeholder for future client management)
INSERT INTO public.role_permissions (role_name, permission_key) VALUES
  ('accountant', 'calculator.use'),
  ('accountant', 'calculation.save'),
  ('accountant', 'calculation.view_own'),
  ('accountant', 'filing.create'),
  ('accountant', 'filing.submit'),
  ('accountant', 'filing.view_own'),
  ('accountant', 'payment.create'),
  ('accountant', 'payment.view_own'),
  ('accountant', 'tax_rules.view');

-- Auditor: read-only audit access
INSERT INTO public.role_permissions (role_name, permission_key) VALUES
  ('auditor', 'calculation.view_all'),
  ('auditor', 'filing.view_all'),
  ('auditor', 'payment.view_all'),
  ('auditor', 'tax_rules.view'),
  ('auditor', 'audit.view'),
  ('auditor', 'audit.export');

-- Admin: full access
INSERT INTO public.role_permissions (role_name, permission_key) VALUES
  ('admin', 'calculator.use'),
  ('admin', 'calculation.save'),
  ('admin', 'calculation.view_own'),
  ('admin', 'calculation.view_all'),
  ('admin', 'filing.create'),
  ('admin', 'filing.submit'),
  ('admin', 'filing.view_own'),
  ('admin', 'filing.view_all'),
  ('admin', 'payment.create'),
  ('admin', 'payment.view_own'),
  ('admin', 'payment.view_all'),
  ('admin', 'tax_rules.view'),
  ('admin', 'tax_rules.publish'),
  ('admin', 'audit.view'),
  ('admin', 'audit.export'),
  ('admin', 'user.manage'),
  ('admin', 'role.assign');

-- 6. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'individual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 7. Create consents table
CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL,
  consent_text_hash TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- 8. Create audit_logs table (immutable)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_json JSONB,
  after_json JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for audit log queries
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- 9. Update profiles table to include onboarding status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS user_type public.app_role DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =============================================
-- SECURITY DEFINER FUNCTIONS (avoid RLS recursion)
-- =============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission public.app_permission)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role_name
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission
  )
$$;

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Function to check if user has accepted current consent version
CREATE OR REPLACE FUNCTION public.has_valid_consent(_user_id UUID, _version TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.consents
    WHERE user_id = _user_id
      AND consent_version = _version
  )
$$;

-- Function to assign default role on signup (called by trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'individual')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-assign role when profile is created
CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Roles table: readable by all authenticated users
CREATE POLICY "roles_select_authenticated" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

-- Permissions table: readable by all authenticated users
CREATE POLICY "permissions_select_authenticated" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

-- Role permissions: readable by all authenticated users
CREATE POLICY "role_permissions_select_authenticated" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

-- User roles: users can view their own roles
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- User roles: admins can view all roles
CREATE POLICY "user_roles_select_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles: only admins can insert/update roles
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_update_admin" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Consents: users can view their own consents
CREATE POLICY "consents_select_own" ON public.consents
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Consents: users can insert their own consents
CREATE POLICY "consents_insert_own" ON public.consents
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Consents: admins can view all consents
CREATE POLICY "consents_select_admin" ON public.consents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs: only admins and auditors can view
CREATE POLICY "audit_logs_select_privileged" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'auditor')
  );

-- Audit logs: any authenticated user can insert (for logging their actions)
CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_user_id);

-- Update profiles policies to allow update
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);