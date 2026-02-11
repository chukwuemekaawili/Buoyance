-- Add finalized_at column to tax_calculations
ALTER TABLE public.tax_calculations 
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create atomic correction RPC for incomes
CREATE OR REPLACE FUNCTION public.correct_income_atomic(
  p_original_id UUID,
  p_amount_kobo TEXT,
  p_source TEXT,
  p_date DATE,
  p_category TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_vatable BOOLEAN DEFAULT FALSE,
  p_output_vat_kobo TEXT DEFAULT NULL,
  p_wht_deducted BOOLEAN DEFAULT FALSE,
  p_wht_credit_kobo INTEGER DEFAULT 0,
  p_tax_exempt BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_original RECORD;
  v_new_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get and lock original record
  SELECT * INTO v_original 
  FROM public.incomes 
  WHERE id = p_original_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_original IS NULL THEN
    RAISE EXCEPTION 'Original record not found';
  END IF;

  IF v_original.status = 'superseded' OR v_original.status = 'corrected' THEN
    RAISE EXCEPTION 'Cannot correct an already superseded record';
  END IF;

  -- Insert new corrected record
  INSERT INTO public.incomes (
    user_id, supersedes_id, status, archived,
    amount_kobo, source, date, category, description,
    vatable, output_vat_kobo, wht_deducted, wht_credit_kobo, tax_exempt
  ) VALUES (
    v_user_id, p_original_id, 'active', false,
    p_amount_kobo, p_source, p_date, p_category, p_description,
    p_vatable, p_output_vat_kobo, p_wht_deducted, p_wht_credit_kobo, p_tax_exempt
  )
  RETURNING id INTO v_new_id;

  -- Mark original as superseded
  UPDATE public.incomes 
  SET status = 'superseded' 
  WHERE id = p_original_id;

  -- Audit log
  INSERT INTO public.audit_logs (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, metadata, user_agent
  ) VALUES (
    v_user_id, 'income.corrected', 'income', v_new_id::TEXT,
    jsonb_build_object(
      'id', v_original.id,
      'amount_kobo', v_original.amount_kobo,
      'source', v_original.source,
      'status', v_original.status
    ),
    jsonb_build_object(
      'id', v_new_id,
      'amount_kobo', p_amount_kobo,
      'source', p_source,
      'status', 'active'
    ),
    jsonb_build_object('supersedes_id', p_original_id),
    NULL
  );

  RETURN json_build_object(
    'success', true,
    'new_id', v_new_id,
    'superseded_id', p_original_id
  );
END;
$$;

-- Create atomic correction RPC for expenses
CREATE OR REPLACE FUNCTION public.correct_expense_atomic(
  p_original_id UUID,
  p_amount_kobo TEXT,
  p_category TEXT,
  p_description TEXT,
  p_date DATE,
  p_vatable BOOLEAN DEFAULT FALSE,
  p_input_vat_kobo TEXT DEFAULT NULL,
  p_deductible BOOLEAN DEFAULT FALSE,
  p_invoice_ref TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_original RECORD;
  v_new_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_original 
  FROM public.expenses 
  WHERE id = p_original_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_original IS NULL THEN
    RAISE EXCEPTION 'Original record not found';
  END IF;

  IF v_original.status = 'superseded' OR v_original.status = 'corrected' THEN
    RAISE EXCEPTION 'Cannot correct an already superseded record';
  END IF;

  INSERT INTO public.expenses (
    user_id, supersedes_id, status, archived,
    amount_kobo, category, description, date,
    vatable, input_vat_kobo, deductible, invoice_ref
  ) VALUES (
    v_user_id, p_original_id, 'active', false,
    p_amount_kobo, p_category, p_description, p_date,
    p_vatable, p_input_vat_kobo, p_deductible, p_invoice_ref
  )
  RETURNING id INTO v_new_id;

  UPDATE public.expenses 
  SET status = 'superseded' 
  WHERE id = p_original_id;

  INSERT INTO public.audit_logs (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, metadata
  ) VALUES (
    v_user_id, 'expense.corrected', 'expense', v_new_id::TEXT,
    jsonb_build_object(
      'id', v_original.id,
      'amount_kobo', v_original.amount_kobo,
      'description', v_original.description,
      'status', v_original.status
    ),
    jsonb_build_object(
      'id', v_new_id,
      'amount_kobo', p_amount_kobo,
      'description', p_description,
      'status', 'active'
    ),
    jsonb_build_object('supersedes_id', p_original_id)
  );

  RETURN json_build_object(
    'success', true,
    'new_id', v_new_id,
    'superseded_id', p_original_id
  );
END;
$$;

-- Create atomic finalization RPC for calculations
CREATE OR REPLACE FUNCTION public.finalize_calculation_atomic(
  p_calculation_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_calc RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_calc 
  FROM public.tax_calculations 
  WHERE id = p_calculation_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_calc IS NULL THEN
    RAISE EXCEPTION 'Calculation not found';
  END IF;

  IF v_calc.finalized = true THEN
    RAISE EXCEPTION 'Calculation is already finalized';
  END IF;

  IF v_calc.status = 'superseded' OR v_calc.status = 'archived' THEN
    RAISE EXCEPTION 'Cannot finalize a superseded or archived calculation';
  END IF;

  UPDATE public.tax_calculations
  SET 
    finalized = true,
    finalized_at = NOW(),
    status = 'finalized'
  WHERE id = p_calculation_id;

  INSERT INTO public.audit_logs (
    actor_user_id, action, entity_type, entity_id,
    before_json, after_json, metadata
  ) VALUES (
    v_user_id, 'calculation.finalized', 'tax_calculation', p_calculation_id::TEXT,
    jsonb_build_object('finalized', false, 'status', v_calc.status),
    jsonb_build_object('finalized', true, 'status', 'finalized', 'finalized_at', NOW()),
    jsonb_build_object(
      'tax_type', v_calc.tax_type,
      'rule_version', v_calc.rule_version,
      'immutable', true
    )
  );

  RETURN json_build_object(
    'success', true,
    'calculation_id', p_calculation_id,
    'finalized_at', NOW()
  );
END;
$$;