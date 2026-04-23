import {
  createClient,
  type SupabaseClient,
  type User,
} from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type BillingPlan = "free" | "pro" | "enterprise";
export type MetricName =
  | "ai_explanations"
  | "ocr_receipts"
  | "api_requests"
  | "bank_syncs";

type WorkspaceRow = {
  id: string;
  billing_plan: string | null;
  subscription_status: string | null;
};

type ConsumeQuotaRow = {
  allowed: boolean;
  current_usage: number;
  remaining: number;
  quota_limit: number;
};

export const PLAN_LIMITS: Record<BillingPlan, Record<MetricName, number>> = {
  free: {
    ai_explanations: 3,
    ocr_receipts: 5,
    api_requests: 100,
    bank_syncs: 0,
  },
  pro: {
    ai_explanations: 100,
    ocr_receipts: 500,
    api_requests: 5000,
    bank_syncs: 10,
  },
  enterprise: {
    ai_explanations: 999999,
    ocr_receipts: 999999,
    api_requests: 999999,
    bank_syncs: 999999,
  },
};

export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
}

export interface AccessibleWorkspace {
  id: string;
  plan: BillingPlan;
}

export interface QuotaResult {
  allowed: boolean;
  currentUsage: number;
  remaining: number;
  limit: number;
  plan: BillingPlan;
}

function isBillingPlan(value: string | null): value is BillingPlan {
  return value === "free" || value === "pro" || value === "enterprise";
}

export async function getAuthenticatedContext(
  req: Request,
): Promise<AuthContext | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey || !authorization) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return { supabase, user: data.user };
}

export async function getAccessibleWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<AccessibleWorkspace | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, billing_plan, subscription_status")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const workspace = data as WorkspaceRow | null;
  if (!workspace) {
    return null;
  }

  const plan =
    workspace.subscription_status === "active" &&
      isBillingPlan(workspace.billing_plan)
      ? workspace.billing_plan
      : "free";

  return {
    id: workspace.id,
    plan,
  };
}

export async function consumeQuota(
  supabase: SupabaseClient,
  workspaceId: string,
  metric: MetricName,
): Promise<QuotaResult> {
  const workspace = await getAccessibleWorkspace(supabase, workspaceId);
  if (!workspace) {
    throw new Error("Workspace not found or not accessible.");
  }

  const limit = PLAN_LIMITS[workspace.plan][metric];
  if (limit <= 0) {
    return {
      allowed: false,
      currentUsage: 0,
      remaining: 0,
      limit,
      plan: workspace.plan,
    };
  }

  const { data, error } = await supabase.rpc("consume_usage_quota", {
    p_workspace_id: workspaceId,
    p_metric_name: metric,
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as ConsumeQuotaRow | null;
  if (!row) {
    throw new Error("Quota check returned no result.");
  }

  return {
    allowed: row.allowed === true,
    currentUsage:
      typeof row.current_usage === "number" ? row.current_usage : 0,
    remaining: typeof row.remaining === "number" ? row.remaining : 0,
    limit: typeof row.quota_limit === "number" ? row.quota_limit : limit,
    plan: workspace.plan,
  };
}

export async function releaseQuota(
  supabase: SupabaseClient,
  workspaceId: string,
  metric: MetricName,
): Promise<void> {
  const { error } = await supabase.rpc("release_usage_quota", {
    p_workspace_id: workspaceId,
    p_metric_name: metric,
    p_amount: 1,
  });

  if (error) {
    console.warn("Failed to release workspace quota:", error.message);
  }
}
