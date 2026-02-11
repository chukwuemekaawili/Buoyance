-- =============================================
-- FILINGS TABLE
-- =============================================
CREATE TABLE public.filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tax_type text NOT NULL CHECK (tax_type IN ('PIT','CIT','VAT','WHT','CGT')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','accepted','rejected','cancelled')),
  rule_version text NOT NULL DEFAULT '',
  input_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_url text NULL,
  submitted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived boolean NOT NULL DEFAULT false
);

-- Indexes for filings
CREATE INDEX idx_filings_user_created ON public.filings (user_id, created_at DESC);
CREATE INDEX idx_filings_status ON public.filings (status);
CREATE INDEX idx_filings_tax_type ON public.filings (tax_type);

-- Enable RLS
ALTER TABLE public.filings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for filings
CREATE POLICY "filings_select_own" ON public.filings
  FOR SELECT USING (auth.uid() = user_id AND archived = false);

CREATE POLICY "filings_select_admin_auditor" ON public.filings
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role));

CREATE POLICY "filings_insert_own" ON public.filings
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'draft' AND archived = false);

CREATE POLICY "filings_update_own_draft" ON public.filings
  FOR UPDATE USING (auth.uid() = user_id AND (status = 'draft' OR archived = true))
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- PAYMENTS TABLE
-- =============================================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  filing_id uuid NOT NULL REFERENCES public.filings(id),
  amount_kobo text NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  payment_method text NULL,
  reference text NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  paid_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived boolean NOT NULL DEFAULT false
);

-- Indexes for payments
CREATE INDEX idx_payments_user_created ON public.payments (user_id, created_at DESC);
CREATE INDEX idx_payments_filing ON public.payments (filing_id);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT USING (auth.uid() = user_id AND archived = false);

CREATE POLICY "payments_select_admin_auditor" ON public.payments
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role));

CREATE POLICY "payments_insert_own" ON public.payments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND archived = false 
    AND EXISTS (SELECT 1 FROM public.filings f WHERE f.id = filing_id AND f.user_id = auth.uid())
  );

CREATE POLICY "payments_update_own" ON public.payments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FILING_EVENTS TABLE
-- =============================================
CREATE TABLE public.filing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id uuid NOT NULL REFERENCES public.filings(id),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for filing_events
CREATE INDEX idx_filing_events_filing_created ON public.filing_events (filing_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.filing_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for filing_events
CREATE POLICY "filing_events_select_own" ON public.filing_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.filings f WHERE f.id = filing_id AND f.user_id = auth.uid())
  );

CREATE POLICY "filing_events_insert_own" ON public.filing_events
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.filings f WHERE f.id = filing_id AND f.user_id = auth.uid())
  );

-- =============================================
-- STORAGE BUCKET for filing documents
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('filing-documents', 'filing-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for filing-documents bucket
CREATE POLICY "filing_docs_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'filing-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "filing_docs_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'filing-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "filing_docs_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'filing-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- RPC FUNCTIONS
-- =============================================

-- Function to create a filing draft
CREATE OR REPLACE FUNCTION public.create_filing_draft(
  p_tax_type text,
  p_period_start date,
  p_period_end date,
  p_input_json jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_filing_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_tax_type NOT IN ('PIT','CIT','VAT','WHT','CGT') THEN
    RAISE EXCEPTION 'Invalid tax type';
  END IF;

  INSERT INTO public.filings (user_id, tax_type, period_start, period_end, input_json, status, archived)
  VALUES (v_user_id, p_tax_type, p_period_start, p_period_end, p_input_json, 'draft', false)
  RETURNING id INTO v_filing_id;

  -- Write audit log
  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, after_json, metadata)
  VALUES (v_user_id, 'filing.created', 'filing', v_filing_id::text, 
    jsonb_build_object('tax_type', p_tax_type, 'period_start', p_period_start, 'period_end', p_period_end),
    jsonb_build_object('status', 'draft'));

  -- Write filing event
  INSERT INTO public.filing_events (filing_id, user_id, event_type, metadata)
  VALUES (v_filing_id, v_user_id, 'created', jsonb_build_object('tax_type', p_tax_type));

  RETURN v_filing_id;
END;
$$;

-- Function to update a filing draft
CREATE OR REPLACE FUNCTION public.update_filing_draft(
  p_filing_id uuid,
  p_input_json jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_filing RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_filing FROM public.filings WHERE id = p_filing_id;

  IF v_filing IS NULL THEN
    RAISE EXCEPTION 'Filing not found';
  END IF;

  IF v_filing.user_id != v_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_filing.status != 'draft' THEN
    RAISE EXCEPTION 'Can only update draft filings';
  END IF;

  UPDATE public.filings
  SET input_json = p_input_json, updated_at = now()
  WHERE id = p_filing_id;

  -- Write audit log
  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, before_json, after_json)
  VALUES (v_user_id, 'filing.updated', 'filing', p_filing_id::text, v_filing.input_json, p_input_json);

  -- Write filing event
  INSERT INTO public.filing_events (filing_id, user_id, event_type, metadata)
  VALUES (p_filing_id, v_user_id, 'updated', jsonb_build_object('changed', 'input_json'));
END;
$$;

-- Function to submit a filing
CREATE OR REPLACE FUNCTION public.submit_filing(
  p_filing_id uuid,
  p_output_json jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_filing RECORD;
  v_rule_version text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_filing FROM public.filings WHERE id = p_filing_id;

  IF v_filing IS NULL THEN
    RAISE EXCEPTION 'Filing not found';
  END IF;

  IF v_filing.user_id != v_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_filing.status != 'draft' THEN
    RAISE EXCEPTION 'Can only submit draft filings';
  END IF;

  -- Get latest published tax rule version
  SELECT version INTO v_rule_version
  FROM public.tax_rules
  WHERE tax_type = v_filing.tax_type AND published = true AND archived = false
  ORDER BY effective_date DESC
  LIMIT 1;

  IF v_rule_version IS NULL THEN
    v_rule_version := 'N/A';
  END IF;

  UPDATE public.filings
  SET 
    status = 'submitted',
    output_json = p_output_json,
    rule_version = v_rule_version,
    submitted_at = now(),
    updated_at = now()
  WHERE id = p_filing_id;

  -- Write audit log
  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, before_json, after_json, metadata)
  VALUES (v_user_id, 'filing.submitted', 'filing', p_filing_id::text, 
    jsonb_build_object('status', 'draft'),
    jsonb_build_object('status', 'submitted', 'rule_version', v_rule_version),
    jsonb_build_object('tax_type', v_filing.tax_type));

  -- Write filing event
  INSERT INTO public.filing_events (filing_id, user_id, event_type, metadata)
  VALUES (p_filing_id, v_user_id, 'submitted', jsonb_build_object('rule_version', v_rule_version));

  RETURN json_build_object(
    'success', true,
    'filing_id', p_filing_id,
    'rule_version', v_rule_version,
    'submitted_at', now()
  );
END;
$$;

-- Function to record a payment
CREATE OR REPLACE FUNCTION public.record_payment(
  p_filing_id uuid,
  p_amount_kobo text,
  p_method text,
  p_reference text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_filing RECORD;
  v_payment_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_filing FROM public.filings WHERE id = p_filing_id;

  IF v_filing IS NULL THEN
    RAISE EXCEPTION 'Filing not found';
  END IF;

  IF v_filing.user_id != v_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_filing.status NOT IN ('submitted', 'accepted') THEN
    RAISE EXCEPTION 'Can only add payments to submitted or accepted filings';
  END IF;

  INSERT INTO public.payments (user_id, filing_id, amount_kobo, payment_method, reference, status, archived)
  VALUES (v_user_id, p_filing_id, p_amount_kobo, p_method, p_reference, 'pending', false)
  RETURNING id INTO v_payment_id;

  -- Write audit log
  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, after_json, metadata)
  VALUES (v_user_id, 'payment.created', 'payment', v_payment_id::text,
    jsonb_build_object('amount_kobo', p_amount_kobo, 'method', p_method, 'status', 'pending'),
    jsonb_build_object('filing_id', p_filing_id));

  -- Write filing event
  INSERT INTO public.filing_events (filing_id, user_id, event_type, metadata)
  VALUES (p_filing_id, v_user_id, 'payment_added', jsonb_build_object('payment_id', v_payment_id, 'amount_kobo', p_amount_kobo));

  RETURN v_payment_id;
END;
$$;

-- Function to update filing document URL
CREATE OR REPLACE FUNCTION public.update_filing_document(
  p_filing_id uuid,
  p_document_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_filing RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_filing FROM public.filings WHERE id = p_filing_id;

  IF v_filing IS NULL THEN
    RAISE EXCEPTION 'Filing not found';
  END IF;

  IF v_filing.user_id != v_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.filings
  SET document_url = p_document_url, updated_at = now()
  WHERE id = p_filing_id;

  -- Write audit log
  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (v_user_id, 'filing.document_generated', 'filing', p_filing_id::text,
    jsonb_build_object('document_url', p_document_url));
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_filing_draft TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_filing_draft TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_filing TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_filing_document TO authenticated;