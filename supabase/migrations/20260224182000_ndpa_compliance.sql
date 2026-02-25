-- =================================================================================
-- SPRINT 2: TRUST & LEGAL (NDPA COMPLIANCE)
-- Adds immutable consent records and DSAR Data Deletion (Right to Be Forgotten)
-- =================================================================================

-- 1. Create consent_records table for NDPA immutable logging
CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL, -- e.g., 'tax_processing', 'marketing'
  consent_version varchar(10) NOT NULL, -- e.g., '1.0'
  ip_address text,
  user_agent text,
  granted_at timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup for checking if a user has signed a specific consent version
CREATE INDEX IF NOT EXISTS idx_consent_records_user_type_version 
ON public.consent_records(user_id, consent_type, consent_version);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- Consent Records RLS: Users can only see and insert their own
DROP POLICY IF EXISTS "consent_records_select_own" ON public.consent_records;
CREATE POLICY "consent_records_select_own" ON public.consent_records
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "consent_records_insert_own" ON public.consent_records;
CREATE POLICY "consent_records_insert_own" ON public.consent_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 2. Data Subject Access Request (DSAR) Deletion RPC
-- This safely anonymizes PII to respect the Right to Be Forgotten, 
-- but deliberately archives (does not delete) financial ledgers to comply 
-- with the statutory 6-year retention period for tax records under FIRS/NTA.
CREATE OR REPLACE FUNCTION public.dsar_delete_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Strict enforce: Only the authenticated user can invoke their own deletion
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Data Subject Access Requests can only be invoked by the account owner';
  END IF;

  ---------------------------------------------------------------------
  -- LEGAL HOLD (NDPA / FIRS 6-Year Retention)
  -- We archive ledgers globally instead of hard-deleting to satisfy tax laws.
  ---------------------------------------------------------------------

  -- Archive Filings
  UPDATE public.filings
  SET archived = true
  WHERE user_id = target_user_id;

  -- Archive Payments
  UPDATE public.payments
  SET archived = true
  WHERE user_id = target_user_id;

  -- Archive Tax Calculations
  UPDATE public.tax_calculations
  SET archived = true
  WHERE user_id = target_user_id;

  ---------------------------------------------------------------------
  -- ANONYMIZATION OF PII (NDPA Right to Be Forgotten)
  ---------------------------------------------------------------------
  
  -- Soft-delete/Anonymize the user profile data. 
  -- We leave the ID intact because foreign keys in financial tables rely on it.
  UPDATE public.profiles
  SET 
    display_name = 'Deleted User',
    first_name = 'Deleted',
    last_name = 'User',
    tax_identity = NULL,
    tin = NULL,
    default_workspace_id = NULL,
    onboarding_completed = false
  WHERE id = target_user_id;

  -- Remove from all workspaces they belong to (to cut off shared access)
  DELETE FROM public.workspace_users
  WHERE user_id = target_user_id;

  -- Log the DSAR action immutably
  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    target_user_id, 
    'DSAR_ACCOUNT_ANONYMIZED', 
    'User', 
    target_user_id::text, 
    '{"reason": "User executed right to be forgotten", "action": "Anonymized PII, maintained 6-year ledger archive via Legal Hold"}'::jsonb
  );

  -- Note: The actual auth.users record must be deleted via a server-side route 
  -- (e.g. an Edge Function) using a service role key directly after this RPC succeeds,
  -- because ordinary users (even in SECURITY DEFINER) do not have rights to delete from auth.users. 
END;
$$;
