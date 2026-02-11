-- ============================================
-- TASK 1: Payment Receipt Upload + Admin Verification
-- ============================================

-- 1) Add columns to payments table for receipt upload and verification
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS receipt_path TEXT,
  ADD COLUMN IF NOT EXISTS receipt_file_name TEXT,
  ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS verification_ip INET,
  ADD COLUMN IF NOT EXISTS verification_user_agent TEXT;

-- 2) Create storage bucket for payment receipts (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- 3) Storage policies for payment-receipts bucket
-- Users can INSERT their own receipts under their folder
CREATE POLICY "users_insert_own_receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can SELECT their own receipts
CREATE POLICY "users_select_own_receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin/Auditor can SELECT any receipt
CREATE POLICY "admin_auditor_select_all_receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role))
);

-- 4) Update payments RLS policies
-- Drop existing update policy to replace with more restrictive one
DROP POLICY IF EXISTS "payments_update_own" ON public.payments;

-- Users can only update their own payments AND cannot set verification_status to verified/rejected
CREATE POLICY "payments_update_own_restricted"
ON public.payments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  verification_status = 'pending'
);

-- 5) Create RPC function for admin to verify payments
CREATE OR REPLACE FUNCTION public.admin_verify_payment(
  p_payment_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL,
  p_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller_id UUID := auth.uid();
  v_payment RECORD;
  v_action TEXT;
BEGIN
  -- Validate caller is admin
  IF NOT has_role(caller_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Only admins can verify payments';
  END IF;

  -- Validate status
  IF p_status NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be "verified" or "rejected"';
  END IF;

  -- Get the payment
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;

  IF v_payment IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.receipt_path IS NULL THEN
    RAISE EXCEPTION 'Cannot verify payment without receipt';
  END IF;

  -- Determine action for audit log
  IF p_status = 'verified' THEN
    v_action := 'payment.verified';
  ELSE
    v_action := 'payment.rejected';
  END IF;

  -- Update the payment
  UPDATE public.payments
  SET
    verification_status = p_status,
    verified_by = caller_id,
    verified_at = NOW(),
    verification_notes = p_notes,
    verification_ip = p_ip,
    verification_user_agent = p_user_agent
  WHERE id = p_payment_id;

  -- Write audit log
  INSERT INTO public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_json,
    after_json,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    caller_id,
    v_action,
    'payment',
    p_payment_id::TEXT,
    jsonb_build_object('verification_status', v_payment.verification_status),
    jsonb_build_object('verification_status', p_status),
    jsonb_build_object(
      'payment_id', p_payment_id,
      'status', p_status,
      'notes', p_notes,
      'filing_id', v_payment.filing_id
    ),
    p_ip::TEXT,
    p_user_agent
  );

  RETURN json_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'verification_status', p_status
  );
END;
$$;

-- Grant execute to authenticated users (function enforces admin-only)
GRANT EXECUTE ON FUNCTION public.admin_verify_payment TO authenticated;