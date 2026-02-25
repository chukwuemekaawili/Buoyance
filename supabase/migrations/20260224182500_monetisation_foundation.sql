-- =================================================================================
-- SPRINT 3: MONETISATION & USAGE LIMITS
-- Adds Subscription columns to Organizations and a Usage Metrics tracking system
-- =================================================================================

-- 1. Extend organizations (Workspaces) with billing fields
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS billing_plan text DEFAULT 'free' CHECK (billing_plan IN ('free', 'pro', 'enterprise')),
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
ADD COLUMN IF NOT EXISTS paystack_customer_id text,
ADD COLUMN IF NOT EXISTS paystack_subscription_code text,
ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- 2. Create usage_metrics table for quota enforcement
-- This table tracks monthly usage counters for rate-limited features.
CREATE TABLE IF NOT EXISTS public.usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric_name text NOT NULL, -- e.g., 'ai_explanations', 'ocr_receipts', 'api_requests'
  billing_period_start timestamptz NOT NULL, -- Resets monthly
  billing_period_end timestamptz NOT NULL,
  current_usage integer DEFAULT 0,
  max_quota integer DEFAULT 0, -- 0 means unlimited or derived from billing_plan logic
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, metric_name, billing_period_start) -- One counter per metric per month per workspace
);

-- Index for fast quota lookups during API calls
CREATE INDEX IF NOT EXISTS idx_usage_metrics_lookup 
ON public.usage_metrics(workspace_id, metric_name, billing_period_start);

-- 3. RLS Policies for usage_metrics
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- Users can only read usage metrics for workspaces they belong to
DROP POLICY IF EXISTS "usage_metrics_select_workspace_users" ON public.usage_metrics;
CREATE POLICY "usage_metrics_select_workspace_users" ON public.usage_metrics
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_users WHERE workspace_id = usage_metrics.workspace_id
    )
  );

-- Only service rol / triggers should write to usage_metrics. 
-- Standard users cannot bypass their quotas via client queries.
DROP POLICY IF EXISTS "usage_metrics_insert_service" ON public.usage_metrics;
CREATE POLICY "usage_metrics_insert_service" ON public.usage_metrics
  FOR INSERT WITH CHECK (false); -- Prevent all direct inserts from authenticated users

DROP POLICY IF EXISTS "usage_metrics_update_service" ON public.usage_metrics;
CREATE POLICY "usage_metrics_update_service" ON public.usage_metrics
  FOR UPDATE USING (false); -- Prevent all direct updates from authenticated users

-- 4. RPC to safely increment usage counters
-- This function acts as a secure proxy to update the metrics. It bypasses RLS using SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.increment_usage(
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
  v_current_period_end timestamptz;
  v_new_usage integer;
  v_user_in_workspace boolean;
BEGIN
  -- 1. Security Check: Ensure the invoking user actually belongs to this workspace
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_users 
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  ) INTO v_user_in_workspace;

  IF NOT v_user_in_workspace THEN
    RAISE EXCEPTION 'Unauthorized: User does not belong to the target workspace';
  END IF;

  -- 2. Determine the current UTC billing period (First day of month to Last day of month)
  v_current_period_start := date_trunc('month', now() AT TIME ZONE 'UTC');
  v_current_period_end := (v_current_period_start + interval '1 month') - interval '1 second';

  -- 3. Upsert the usage counter:
  -- If it doesn't exist for this month, insert it starting at `p_amount`.
  -- If it exists, add `p_amount` to the `current_usage` field.
  INSERT INTO public.usage_metrics (
    workspace_id, 
    metric_name, 
    billing_period_start, 
    billing_period_end, 
    current_usage
  )
  VALUES (
    p_workspace_id, 
    p_metric_name, 
    v_current_period_start, 
    v_current_period_end, 
    p_amount
  )
  ON CONFLICT (workspace_id, metric_name, billing_period_start)
  DO UPDATE SET 
    current_usage = usage_metrics.current_usage + EXCLUDED.current_usage,
    updated_at = now()
  RETURNING current_usage INTO v_new_usage;

  RETURN v_new_usage;
END;
$$;
