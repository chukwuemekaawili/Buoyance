-- Atomic quota consumption and release helpers for edge-function enforcement.

CREATE OR REPLACE FUNCTION public.consume_usage_quota(
  p_workspace_id uuid,
  p_metric_name text,
  p_limit integer
)
RETURNS TABLE (
  allowed boolean,
  current_usage integer,
  remaining integer,
  quota_limit integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_period_start timestamptz;
  v_current_period_end timestamptz;
  v_new_usage integer;
  v_existing_usage integer;
  v_user_in_workspace boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_users
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  ) INTO v_user_in_workspace;

  IF NOT v_user_in_workspace THEN
    RAISE EXCEPTION 'Unauthorized: User does not belong to the target workspace';
  END IF;

  IF p_limit <= 0 THEN
    RETURN QUERY
    SELECT false, 0, 0, p_limit;
    RETURN;
  END IF;

  v_current_period_start := date_trunc('month', now() AT TIME ZONE 'UTC');
  v_current_period_end := (v_current_period_start + interval '1 month') - interval '1 second';

  WITH usage_upsert AS (
    INSERT INTO public.usage_metrics (
      workspace_id,
      metric_name,
      billing_period_start,
      billing_period_end,
      current_usage,
      max_quota
    )
    VALUES (
      p_workspace_id,
      p_metric_name,
      v_current_period_start,
      v_current_period_end,
      1,
      p_limit
    )
    ON CONFLICT (workspace_id, metric_name, billing_period_start)
    DO UPDATE SET
      current_usage = usage_metrics.current_usage + 1,
      max_quota = EXCLUDED.max_quota,
      updated_at = now()
    WHERE usage_metrics.current_usage < p_limit
    RETURNING current_usage
  )
  SELECT current_usage INTO v_new_usage
  FROM usage_upsert;

  IF v_new_usage IS NULL THEN
    SELECT current_usage INTO v_existing_usage
    FROM public.usage_metrics
    WHERE workspace_id = p_workspace_id
      AND metric_name = p_metric_name
      AND billing_period_start = v_current_period_start;

    v_existing_usage := COALESCE(v_existing_usage, p_limit);

    RETURN QUERY
    SELECT false, v_existing_usage, GREATEST(0, p_limit - v_existing_usage), p_limit;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT true, v_new_usage, GREATEST(0, p_limit - v_new_usage), p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_usage_quota(
  p_workspace_id uuid,
  p_metric_name text,
  p_amount integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_period_start timestamptz;
  v_user_in_workspace boolean;
  v_new_usage integer;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_users
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  ) INTO v_user_in_workspace;

  IF NOT v_user_in_workspace THEN
    RAISE EXCEPTION 'Unauthorized: User does not belong to the target workspace';
  END IF;

  v_current_period_start := date_trunc('month', now() AT TIME ZONE 'UTC');

  UPDATE public.usage_metrics
  SET
    current_usage = GREATEST(0, current_usage - GREATEST(p_amount, 1)),
    updated_at = now()
  WHERE workspace_id = p_workspace_id
    AND metric_name = p_metric_name
    AND billing_period_start = v_current_period_start
  RETURNING current_usage INTO v_new_usage;

  RETURN COALESCE(v_new_usage, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_usage_quota(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_usage_quota(uuid, text, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.release_usage_quota(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_usage_quota(uuid, text, integer) TO authenticated, service_role;
